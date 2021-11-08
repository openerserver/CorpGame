var C_PEEP_METADATA = {
	   c_tft: {frame:0, color:"#4089DD"}, 
       c_all_d: {frame:1, color:"#52537F"},
       c_all_c: {frame:2, color:"#FF75FF"},
       c_grudge: {frame:3, color:"#efc701"},
       c_prober: {frame:4, color:"#f6b24c"},
       c_tf2t: {frame:5, color:"#88A8CE"},
       c_pavlov: {frame:6, color:"#86C448"},
       c_random: {frame:7, color:"#FF5E5E"}
	//random2: {frame:8, color:"#FF5E00"}
};

var PD = {};
PD.COOPERATE = "COOPERATE";
PD.CHEAT = "CHEAT";

PD.PAYOFFS_DEFAULT = {
	P: 0, // punishment: neither of you get anything
	S: -1, // sucker: you put in coin, other didn't.
	R: 2, // reward: you both put 1 coin in, both got 3 back
	T: 3 // temptation: you put no coin, got 3 coins anyway
};

PD.PAYOFFS = JSON.parse(JSON.stringify(PD.PAYOFFS_DEFAULT));

subscribe("pd/editPayoffs", function(payoffs){
	PD.PAYOFFS = payoffs;
});
subscribe("pd/editPayoffs/P", function(value){ PD.PAYOFFS.P = value; });
subscribe("pd/editPayoffs/S", function(value){ PD.PAYOFFS.S = value; });
subscribe("pd/editPayoffs/R", function(value){ PD.PAYOFFS.R = value; });
subscribe("pd/editPayoffs/T", function(value){ PD.PAYOFFS.T = value; });
subscribe("pd/defaultPayoffs", function(){

	PD.PAYOFFS = JSON.parse(JSON.stringify(PD.PAYOFFS_DEFAULT));

	publish("pd/editPayoffs/P", [PD.PAYOFFS.P]);
	publish("pd/editPayoffs/S", [PD.PAYOFFS.S]);
	publish("pd/editPayoffs/R", [PD.PAYOFFS.R]);
	publish("pd/editPayoffs/T", [PD.PAYOFFS.T]);

});

PD.NOISE = 0;
subscribe("companyrules/noise",function(value){
	PD.NOISE = value;
});

PD.getPayoffs = function(move1, move2){
	var payoffs = PD.PAYOFFS;
	if(move1==PD.CHEAT && move2==PD.CHEAT) return [payoffs.P, payoffs.P]; // both punished
	if(move1==PD.COOPERATE && move2==PD.CHEAT) return [payoffs.S, payoffs.T]; // sucker - temptation
	if(move1==PD.CHEAT && move2==PD.COOPERATE) return [payoffs.T, payoffs.S]; // temptation - sucker
	if(move1==PD.COOPERATE && move2==PD.COOPERATE) return [payoffs.R, payoffs.R]; // both rewarded
};

PD.playOneGame = function(playerA, playerB){

	// Make your moves!
	var A = playerA.play();
	var B = playerB.play();

	// Noise: random mistakes, flip around!
	if(Math.random()<PD.NOISE) A = ((A==PD.COOPERATE) ? PD.CHEAT : PD.COOPERATE);
	if(Math.random()<PD.NOISE) B = ((B==PD.COOPERATE) ? PD.CHEAT : PD.COOPERATE);
	
	// Get payoffs
	var payoffs = PD.getPayoffs(A,B);

	// Remember own & other's moves (or mistakes)
	playerA.remember(A, B);
	playerB.remember(B, A);

	// Add to scores (only in tournament?)
	playerA.addPayoff(payoffs[0]);
	playerB.addPayoff(payoffs[1]);

	// Return the payoffs...
	return payoffs;

};

PD.playRepeatedGame = function(playerA, playerB, turns){

	// I've never met you before, let's pretend
	playerA.resetLogic();
	playerB.resetLogic();

	// Play N turns
	var scores = {
		totalA:0,
		totalB:0,
		payoffs:[]
	};
	for(var i=0; i<turns; i++){
		var p = PD.playOneGame(playerA, playerB);
		scores.payoffs.push(p);
		scores.totalA += p[0];
		scores.totalB += p[1];
	}

	// Return the scores...
	// console.log(turns);
	// console.log(scores.totalA);
	// console.log(scores.totalB);
	// console.log(scores);
	return scores;

};

PD.playOneTournament = function(agents, turns){

	// Reset everyone's coins
	// console.log(agents[0].coins);
	// console.log(agents[0]);
	// console.log(agents[0].coins);
	for(var i=0; i<agents.length; i++){
		// console.log(agents[i]);
		agents[i].resetCoins();
	}
	//console.log(agents);
	// console.log(turns);

	// Round robin!
	for(var i=0; i<agents.length; i++){
		var playerA = agents[i];
		for(var j=i+1; j<agents.length; j++){
			var playerB = agents[j];
			PD.playRepeatedGame(playerA, playerB, turns);
			// console.log(agents[i].coins);
		}	
	}

};
PD.GETALLSCORES = function(agents){
    var scores = [];
    for(var i=0; i<agents.length; i++){
        scores.push(agents[i].getScore());
    }
    return scores;
}
PD.GETTOTALSCORES = function(agents){
    var scores =0;
    for(var i=0; i<agents.length; i++){
        scores += agents[i].getScore();
    }
    return scores;
}

//corprate_num 代表1个人与几个人合作，这个不超过10
// turns 代表合作的次数，这个值不应过高，过高代表他的工作都是完全要与其他人合作，长期会导致他对工作没有成就感
// task_num 代表几个任务，这个代表1个月内的数目
PD.playOneTournament_1 = function(agents,corprate_num, turns,task_num){

	// Reset everyone's coins
	// console.log(agents[0].coins);
	// console.log(agents[0]);
	// console.log(agents[0].coins);
	for(var i=0; i<agents.length; i++){
		// console.log(agents[i]);
		agents[i].resetCoins();
	}
	//console.log(agents);
	// console.log(turns);
    // 如果corprate_num大于agents.length，则代表所有人都合作
    if (corprate_num>agents.length-1) {
        corprate_num=agents.length-1;
    }

    for (var i = 0; i < task_num; i++) {
        for (var j = 0; j < agents.length; j++) {
            var playerA = agents[j];
            var corprate_index = getRadnomArray(agents.length,corprate_num);
            for (var k = 0; k < corprate_index.length; k++) {
                var playerB = agents[corprate_index[k]];
                PD.playRepeatedGame_1(playerA, playerB, turns);
            }
        }
    }
    
};
function getRadnomArray(length,max){
    var arr=[];
    for(var i=0;i<length;i++){
        arr.push(i);
    }
    var index=[];
    for(var i=0;i<max;i++){
        var random=Math.floor(Math.random()*arr.length);
        index.push(arr.splice(random,1)[0]);
    }
    return index;
    
}

function getRandomInt(max) {
    return Math.floor(Math.random() * max);
}

function getRandomIntInclusive(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1) + min); //The maximum is inclusive and the minimum is inclusive
}

PD.playRepeatedGame_1 = function(playerA, playerB, turns){

	// I've never met you before, let's pretend
	playerA.resetLogic();
	playerB.resetLogic();

	// Play N turns
	var scores = {
		totalA:0,
		totalB:0,
		payoffs:[]
	};
	for(var i=0; i<turns; i++){
		var p = PD.playOneGame(playerA, playerB);
		scores.payoffs.push(p);
		scores.totalA += p[0];
		scores.totalB += p[1];
	}

	// Return the scores...
	// console.log(turns);
	// console.log(scores.totalA);
	// console.log(scores.totalB);
	// console.log(scores);
	return scores;

};

///////////////////////////////////////////////////////
///////////////////////////////////////////////////////
///////////////////////////////////////////////////////

function Logic_c_tft(){ // 复读机，每次都是对方的最后一次行为
	var self = this;
	var otherMove = PD.COOPERATE;
	self.play = function(){
		return otherMove;
	};
	self.remember = function(own, other){
		otherMove = other;
	};
}
//复读鸭，对方连续欺骗两次，自己欺骗一次
function Logic_c_tf2t(){ 
	var self = this;
	var howManyTimesCheated = 0;
	self.play = function(){
		if(howManyTimesCheated>=2){
			return PD.CHEAT; // retaliate ONLY after two betrayals
		}else{
			return PD.COOPERATE;
		}
	};
	self.remember = function(own, other){
		if(other==PD.CHEAT){
			howManyTimesCheated++;
		}else{
			howManyTimesCheated = 0;
		}
	};
}

function Logic_c_grudge(){ //如果曾经欺骗自己，就总是欺骗对方
	var self = this;
	var everCheatedMe = false;
	self.play = function(){
		if(everCheatedMe) return PD.CHEAT;
		return PD.COOPERATE;
	};
	self.remember = function(own, other){
		if(other==PD.CHEAT) everCheatedMe=true;
	};
}

function Logic_c_all_d(){ //总是欺骗
	var self = this;
	self.play = function(){
		return PD.CHEAT;
	};
	self.remember = function(own, other){
		// nah
	};
}

function Logic_c_all_c(){ //总是合作
	var self = this;
	self.play = function(){
		return PD.COOPERATE;
	};
	self.remember = function(own, other){
		// nah
	};
}

function Logic_c_random(){ //随机
	var self = this;
	self.play = function(){
		return (Math.random()>0.5 ? PD.COOPERATE : PD.CHEAT);
	};
	self.remember = function(own, other){
		// nah
	};
}
function Logic_c_random2(){
	var self = this;
	self.play = function(){
		return (Math.random()>0.5 ? PD.COOPERATE : PD.CHEAT);
	};
	self.remember = function(own, other){
		// nah
	};
}

// Start off Cooperating
// Then, if opponent cooperated, repeat past move. otherwise, switch.
// 一根筋
//开始合作，如果对方合作，就重复过去的行为，
// 如果对方欺骗，我就改变下次的行为
function Logic_c_pavlov(){ 
	var self = this;
	var myLastMove = PD.COOPERATE;
	self.play = function(){
		return myLastMove;
	};
	self.remember = function(own, other){
		myLastMove = own; // remember MISTAKEN move
		if(other==PD.CHEAT) myLastMove = ((myLastMove==PD.COOPERATE) ? PD.CHEAT : PD.COOPERATE); // switch!
	};
}

// TEST by Cooperate | Cheat | Cooperate | Cooperate
// If EVER retaliates, keep playing TFT
// If NEVER retaliates, switch to ALWAYS DEFECT
function Logic_c_prober(){
	//测试，合作，欺骗，合作，合作
	//如果曾经骗过我，就使用tft策略
	//如果没有，就总是骗他

	var self = this;

	var moves = [PD.COOPERATE, PD.CHEAT, PD.COOPERATE, PD.COOPERATE];
	var everCheatedMe = false;

	var otherMove = PD.COOPERATE;
	self.play = function(){
		if(moves.length>0){
			// Testing phase
			var move = moves.shift();
			return move;
		}else{
			if(everCheatedMe){
				return otherMove; // TFT
			}else{
				return PD.CHEAT; // Always Cheat
			}
		}
	};
	self.remember = function(own, other){
		if(moves.length>0){
			if(other==PD.CHEAT) everCheatedMe=true; // Testing phase: ever retaliated?
		}
		otherMove = other; // for TFT
	};

}
