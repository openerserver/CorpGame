function CompanyUI(config){

	var self = this;
	self.id = config.id;
	self.slideshow = config.slideshow;
	var max_num=config.max_num; // max number of images to display

	// Create DOM
	self.dom = document.createElement("div");
	self.dom.className = "object";
	var dom = self.dom;
	

	/////////////////////////////////////////
	// BUTTONS for playing //////////////////
	/////////////////////////////////////////

	var playButton = new Button({
		x:62, y:165, text_id:"label_start", size:"short",
		onclick: function(){
			if(slideshow.objects.companytournament.isAutoPlaying){
				publish("companytournament/autoplay/stop");
			}else{
				publish("companytournament/autoplay/start");
			}
		}
	});
	listen(self, "companytournament/autoplay/stop",function(){
		playButton.setText("label_start");
	});
	listen(self, "companytournament/autoplay/start",function(){
		playButton.setText("label_stop");
	});
	dom.appendChild(playButton.dom);

	var stepButton = new Button({
		x:62, y:165+70, text_id:"label_step", message:"companytournament/step", size:"short"
	});
	dom.appendChild(stepButton.dom);
	
	var resetButton = new Button({x:62, y:165+70*2, text_id:"label_reset", message:"companytournament/reset", size:"short"});
	dom.appendChild(resetButton.dom);

	/////////////////////////////////////////
	// Create TABS & PAGES //////////////////
	/////////////////////////////////////////

	// Tabs
	var tabs = document.createElement("div");
	tabs.id = "sandbox_tabs";
	dom.appendChild(tabs);

	// Tab Hitboxes
	var _makeHitbox = function(label, x, width, pageIndex){

		label = label.toUpperCase();

		var hitbox = document.createElement("div");
		hitbox.className = "hitbox";
		hitbox.style.left = x+"px";
		hitbox.style.width = width+"px";
		hitbox.innerHTML = label;
		tabs.appendChild(hitbox);

		(function(pageIndex){
			hitbox.onclick = function(){
				_goToPage(pageIndex);
			};
		})(pageIndex);

	};
	_makeHitbox(Words.get("label_company_population"), 50, 100, 0);
	_makeHitbox(Words.get("label_company_payoffs"), 230, 100, 1);
	_makeHitbox(Words.get("label_company_rules"), 380, 50, 2);
	// _makeHitbox(Words.get("label_settings"), 506, 100, 3);

	// Pages
	var pages = [];
	var _makePage = function(){
		var page = document.createElement("div");
		page.className = "sandbox_page";
		tabs.appendChild(page);
		pages.push(page);
	};
	for(var i=0; i<4; i++) _makePage(); // make three pages

	// Go To Page
	var _goToPage = function(showIndex){

		// Background
		tabs.style.backgroundPosition = (-showIndex*500)+"px 0px";

		// Show page
		for(var i=0; i<pages.length; i++) pages[i].style.display = "none";
		pages[showIndex].style.display = "block";

	};
	_goToPage(0);

	/////////////////////////////////////////
	// PAGE 0: POPULATION ///////////////////
	/////////////////////////////////////////

	var page = pages[0];

	// Labels
	page.appendChild(_makeLabel("company_population", {x:0, y:0, w:433}));

	// Create an icon, label, and slider... that all interact with each other.
	var sliders = [];
	var _makePopulationControl = function(x, y, peepID, defaultValue){

		// DOM
		var popDOM = document.createElement("div");
		popDOM.className = "sandbox_pop";
		popDOM.style.left = x;
		popDOM.style.top = y;
		page.appendChild(popDOM);

		// Message
		var message = "sandbox/pop/"+peepID;

		// Icon
		var popIcon = document.createElement("div");
		popIcon.className = "sandbox_pop_icon";
		popIcon.style.backgroundPosition = (-C_PEEP_METADATA[peepID].frame*40)+"px 0px";
		popDOM.appendChild(popIcon);

		// Label: Name
		var popName = document.createElement("div");
		popName.className = "sandbox_pop_label";
		popName.innerHTML = Words.get("label_short_"+peepID).toUpperCase();
        // popName.className = "dot";
		popName.style.color = C_PEEP_METADATA[peepID].color;
		popDOM.appendChild(popName);

		// Label: Amount
		var popAmount = document.createElement("div");
		popAmount.className = "sandbox_pop_label";
		popAmount.style.textAlign = "right";
        self.dom.setAttribute("data-balloon-length", "large");
        popAmount.setAttribute("data-balloon", Words.get("who_"+peepID));
	    popAmount.setAttribute("data-balloon-pos", "up");
		popAmount.style.color = C_PEEP_METADATA[peepID].color;
		popDOM.appendChild(popAmount);
		listen(self, message, function(value){
			popAmount.innerHTML = value;
		});

		// Slider
		(function(peepID){
			var popSlider = new Slider({
				x:0, y:35, width:200,
				min:0, max:50, step:1,
				id:message,
				message: message,
				onselect: function(){
					_anchorPopulation(peepID);
				},
				onchange: function(value){
					_adjustPopulation(peepID, value);
				}
			});
			sliders.push(popSlider);
			popSlider.slideshow = self.slideshow;
			popDOM.appendChild(popSlider.dom);
		})(peepID);

		// Default value!
		publish(message, [defaultValue]);

	};
	var xDiff = 220;
	var yDiff = 80;
	var yOff = 40;
	var ss=parseInt(max_num/8);
	_makePopulationControl(    0, yOff+0,       "c_tft",		ss);
	_makePopulationControl(xDiff, yOff+0,       "c_all_d",	ss);
	_makePopulationControl(    0, yOff+yDiff,   "c_all_c",	ss);
	_makePopulationControl(xDiff, yOff+yDiff,   "c_grudge",	ss);
	_makePopulationControl(    0, yOff+yDiff*2, "c_prober",	ss);
	_makePopulationControl(xDiff, yOff+yDiff*2, "c_pavlov",		ss);
	_makePopulationControl(    0, yOff+yDiff*3, "c_tf2t",	ss);
	_makePopulationControl(xDiff, yOff+yDiff*3, "c_random",	max_num-ss*7);
	//_makePopulationControl(    0, yOff+yDiff*3, "random2",	5);

	// Adjust the WHOLE population...
	/******************************

	Adjust by SCALING. (and in the edge case of "all zero", scale equally)
	Round to integers. (if above or below max_num in total, keep adding/subtracting 1 down the line)

	******************************/
	var _population;
	var _remainder;
	var _anchoredIndex;
	var _anchorPopulation = function(peepID){
		// Which index should be anchored?
		_anchoredIndex = CompanyTournament.INITIAL_AGENTS.findIndex(function(config){
			return config.strategy==peepID;
		});
		var initValue = CompanyTournament.INITIAL_AGENTS[_anchoredIndex].count;

		// SPECIAL CASE: THIS IS ALREADY FULL
		if(initValue==max_num){

			// Pretend it was 1 for all seven others, max_num-7 for this.
			_population = [];
			for(var i=0; i<CompanyTournament.INITIAL_AGENTS.length; i++){
				if(i==_anchoredIndex){
					_population.push(max_num-7);
				}else{
					_population.push(1);
				}
			}

			// Remainder is 7
			_remainder = 7;

		}else{

			// Create array of all initial agents...
			_population = [];
			for(var i=0; i<CompanyTournament.INITIAL_AGENTS.length; i++){
				var conf = CompanyTournament.INITIAL_AGENTS[i];
				_population.push(conf.count);
			}

			// Remainder sum of those NOT anchored (max_num-anchor.count)
			_remainder = max_num-initValue;

		}

	};
	var _adjustPopulation = function(peepID, value){

		// Change the anchored one
		CompanyTournament.INITIAL_AGENTS.find(function(config){
			return config.strategy==peepID;
		}).count = value;
		
		// What's the scale for the rest of 'em?
		var newRemainder = max_num-value;
		var scale = newRemainder/_remainder;

		// Adjust everyone to scale, ROUNDING.
		var total = 0;
		for(var i=0; i<CompanyTournament.INITIAL_AGENTS.length; i++){

			// do NOT adjust anchor.
			var conf = CompanyTournament.INITIAL_AGENTS[i];
			if(conf.strategy==peepID) continue;

			var initCount = _population[i];
			var newCount = Math.round(initCount*scale);
			conf.count = newCount;

			// Count total!
			total += newCount;

		}
		total += value; // total

		// Difference... 
		var diff = max_num-total;
		// If negative, remove one starting from BOTTOM, skipping anchor.
		// (UNLESS IT'S ZERO)
		if(diff<0){
			for(var i=CompanyTournament.INITIAL_AGENTS.length-1; i>=0 && diff<0; i--){
				// do NOT adjust anchor.
				var conf = CompanyTournament.INITIAL_AGENTS[i];
				if(conf.strategy==peepID) continue;
				if(conf.count==0) continue; // DON'T DO IT IF IT'S ZERO
				conf.count--; // REMOVE
				diff++; // yay
			}
		}
		// If positive, add one starting from TOP, skipping anchor.
		// (UNLESS IT'S ZERO)
		var everyoneElseWasZero = true;
		if(diff>0){
			for(var i=0; i<CompanyTournament.INITIAL_AGENTS.length && diff>0; i++){
				// do NOT adjust anchor.
				var conf = CompanyTournament.INITIAL_AGENTS[i];
				if(conf.strategy==peepID) continue;
				if(conf.count==0) continue; // DO NOT ADD IF ZERO
				everyoneWasZero = false;
				conf.count++; // ADD
				diff--; // yay
			}
		}
		// ...edge case. fine w/e
		if(everyoneElseWasZero){
			for(var i=0; i<CompanyTournament.INITIAL_AGENTS.length && diff>0; i++){
				// do NOT adjust anchor.
				var conf = CompanyTournament.INITIAL_AGENTS[i];
				if(conf.strategy==peepID) continue;
				// if(conf.count==0) continue; // DO NOT ADD IF ZERO
				// everyoneWasZero = false;
				conf.count++; // ADD
				diff--; // yay
			}
		}

		// NOW adjust UI
		for(var i=0; i<CompanyTournament.INITIAL_AGENTS.length; i++){
			// do NOT adjust anchor.
			var conf = CompanyTournament.INITIAL_AGENTS[i];
			if(conf.strategy==peepID) continue;
			publish("sandbox/pop/"+conf.strategy, [conf.count]);
		}

		// Reset!
		publish("companytournament/reset");

	};

	/////////////////////////////////////////
	// PAGE 1: PAYOFFS //////////////////////
	/////////////////////////////////////////

	var page = pages[1];

	// Labels
	page.appendChild(_makeLabel("company_payoffs", {x:0, y:0, w:433}));
	
	// PAYOFFS
	var payoffsUI = new PayoffsUI({x:84, y:41, scale:0.9, slideshow:self});
	page.appendChild(payoffsUI.dom);

	// Reset
	var resetPayoffs = new Button({
		x:240, y:300, text_id:"sandbox_reset_payoffs",
		message:"pd/defaultPayoffs"
	});
	page.appendChild(resetPayoffs.dom);

	/////////////////////////////////////////
	// PAGE 2: RULES ////////////////////////
	/////////////////////////////////////////

	var page = pages[2];

	// Rule: Number of turns (1 to 50)
	var rule_turns = _makeLabel("company_rules_1", {x:0, y:210, w:430});
	var slider_turns = new Slider({
		x:0, y:240, width:430,
		min:1, max:500, step:1,
		message: "companyrules/turns"
	});
	sliders.push(slider_turns);
	slider_turns.slideshow = self.slideshow;
	listen(self, "companyrules/turns",function(value){
		var words = (value==1) ? Words.get("company_rules_1_single") : Words.get("company_rules_1"); // plural?
		words = words.replace(/\[N\]/g, value+""); // replace [N] with the number value
		rule_turns.innerHTML = words;
	});
	page.appendChild(rule_turns);
	page.appendChild(slider_turns.dom);

	// Rule: Eliminate/Reproduce how many? (1 to 12)
	var rule_evolution = _makeLabel("company_rules_2", {x:0, y:290, w:433});
	var slider_evolution = new Slider({
		x:0, y:350, width:430,
		min:0, max:max_num, step:1,
		message: "companyrules/evolution"
	});
	sliders.push(slider_evolution);
	slider_evolution.slideshow = self.slideshow;
	listen(self, "companyrules/evolution",function(value){
		var words = (value==1) ? Words.get("company_rules_2_single") : Words.get("company_rules_2"); // plural?
		words = words.replace(/\[N\]/g, value+""); // replace [N] with the number value
		rule_evolution.innerHTML = words;
	});
	page.appendChild(rule_evolution);
	page.appendChild(slider_evolution.dom);

	// Rule: Noise (0% to 50%)
	var rule_noise = _makeLabel("company_rules_3", {x:0, y:390, w:433});
	var slider_noise = new Slider({
		x:0, y:420, width:430,
		min:0.00, max:0.5, step:0.01,
		message: "companyrules/noise"
	});
	sliders.push(slider_noise);
	slider_noise.slideshow = self.slideshow;
	listen(self, "companyrules/noise",function(value){
		value = Math.round(value*100);
		var words = Words.get("company_rules_3");
		words = words.replace(/\[N\]/g, value+""); // replace [N] with the number value
		rule_noise.innerHTML = words;
	});
	page.appendChild(rule_noise);
	page.appendChild(slider_noise.dom);

	// 小组成员数
	var rule_turns2 = _makeLabel("company_rules_4", {x:0, y:0, w:433});
	var slider_turns2 = new Slider({
		x:0, y:30, width:430,
		min:3, max:50, step:1,
		message: "companyrules/turns2"
	});
	sliders.push(slider_turns2);
	slider_turns2.slideshow = self.slideshow;
	listen(self, "companyrules/turns2",function(value){
		var words = Words.get("company_rules_4"); // plural?
		words = words.replace(/\[N\]/g, value+""); // replace [N] with the number value
		rule_turns2.innerHTML = words;
		max_num=value;
		publish("companyrules/max_num", [max_num]);

		// // 更新每个slider的max值
		// for(var i=0;i<sliders.length;i++) {
		// 	if (sliders[i].id != undefined) {
		// 		if(sliders[i].id.includes("sandbox/pop/")) {
		// 			// console.log(sliders[i]);
		// 			sliders[i].setParam("max", max_num);
		// 		}
		// 	}
		// }

	});
	page.appendChild(rule_turns2);
	page.appendChild(slider_turns2.dom);

// 每个月进行 [N] 次任务
    var rule_turns5 = _makeLabel("company_rules_5", {x:0, y:70, w:430});
	var slider_turns5 = new Slider({
		x:0, y:100, width:430,
		min:1, max:100, step:1,
		message: "companyrules/task_num"
	});
	sliders.push(slider_turns5);
	slider_turns5.slideshow = self.slideshow;
	listen(self, "companyrules/task_num",function(value){
		var words =  Words.get("company_rules_5"); //
		words = words.replace(/\[N\]/g, value+""); // replace [N] with the number value
		rule_turns5.innerHTML = words;
	});
	page.appendChild(rule_turns5);
	page.appendChild(slider_turns5.dom);


    // 每个人需要与 [N] 个人合作完成任务：
    var rule_turns6 = _makeLabel("company_rules_6", {x:0, y:140, w:430});
	var slider_turns6 = new Slider({
		x:0, y:170, width:430,
		min:0, max:max_num-1, step:1,
		message: "companyrules/cop_num"
	});
	sliders.push(slider_turns6);
	slider_turns6.slideshow = self.slideshow;
	listen(self, "companyrules/cop_num",function(value){
		var words = Words.get("company_rules_6"); // 
		words = words.replace(/\[N\]/g, value+""); // replace [N] with the number value
		rule_turns6.innerHTML = words;
	});
	page.appendChild(rule_turns6);
	page.appendChild(slider_turns6.dom);

	// DEFAULTS
	
	publish("companyrules/turns", [10]);
	publish("companyrules/evolution", [1]);
	publish("companyrules/noise", [0.00]);
	publish("companyrules/turns2", [max_num]);
    publish("companyrules/task_num", [10]);
    publish("companyrules/cop_num", [3]);


	/////////////////////////////////////////
	// Add & Remove Object //////////////////
	/////////////////////////////////////////
	
	// Add...
	self.add = function(){
		_add(self);
	};

	// Remove...
	self.remove = function(){
		payoffsUI.remove();
		//for(var i=0;i<numbers.length;i++) unlisten(numbers[i]);
		for(var i=0;i<sliders.length;i++) unlisten(sliders[i]);
		unlisten(self);
		_remove(self);
	};


	
	
	
}