SLIDES.push({

	id: "company",
	onstart: function(self){
		var max=20;
		self.postion=0;
		self.scoresid=[];
		// The tournament simulation
		CompanyTournament.resetGlobalVariables(max);

		self.add({id:"companytournament", type:"CompanyTournament", x:-20, y:-20});

		// Screw it, just ALL of the Sandbox UI
		self.add({id:"sandbox", type:"CompanyUI",max_num:max});
		self.add({
			id:"companyscore", type:"TextBox",
			x:920, y:0, align:"right",
			text: Words.get("label_score_loser")
		});
		// Label & Button for next...
		// self.add({
		// 	id:"companyscore", type:"TextBox",
		// 	x:950, y:0, align:"right",
		// 	text_id: "company_score"
		// });
		subscribe("companytournament/score", function(score,number,agentname){
			self.postion=+(number+1)*25;
			self.add({
				id:"companyscore"+number, type:"TextBox",
				x:920, y:self.postion, align:"left",
				text: "第"+(number+1)+"月:"+score +" "+agentname
			});
			self.scoresid.push("companyscore"+number);
		});
		subscribe("companytournament/clearscore", function(){
			for(var i=0;i<self.scoresid.length;i++){
				document.getElementById(self.scoresid[i]).remove();
			}
			self.postion=0;
			self.scoresid=[];
		});
		// self.add({
		// 	id:"button_next", type:"Button",
		// 	x:605, y:485, size:"long",
		// 	text_id:"sandbox_end_btn",
		// 	message: "slideshow/scratch"
		// });
		
	},
	onend: function(self){
		self.clear();
	}

});