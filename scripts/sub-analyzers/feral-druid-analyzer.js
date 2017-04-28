///////////////////////////////////////////////////////////////////////////////
// FERAL DRUID ANALYZER
///////////////////////////////////////////////////////////////////////////////

function FeralDruidSubAnalyzer ( playerName, playerInfo, fight, enemyNameMapping ) {
	
	// CONSTANTS
	
	this.druidOrangeColor = 'ff7d0a';
	this.darkGrayColor = '888888';
	
	// number of simulations to run to get AB average
	this.numSims = 10000;
	
	// relevent spell IDs
	this.ripId = 1079;
	this.abId = 210705;
	this.fbId = 22568;
	
	// handled on 'cast'
	this.cpIds = new Set();
	this.cpIds.add(1822); // rake
	this.cpIds.add(210722); // af
	this.cpIds.add(5221); // shred
	this.cpIds.add(8921); // moonfire
	
	// handled on 'damage'
	this.directAoeCpIds = new Set();
	this.directAoeCpIds.add(106785); // cat swipe
	this.directAoeCpIds.add(202028) // BrS
	
	// handled on 'applydebuff' and 'refreshdebuff'
	this.dotAoeCpIds = new Set();
	this.dotAoeCpIds.add(106830); // cat thrash
	
	// INSTANCE VARS
	
	this.playerId = playerInfo.sourceID;
	
	this.ripDuration = 24 * 1000;
	
	if( playerInfo.talents[5].id = 202032 ) { // Jagged Wounds
		console.log(playerName + " is specced for Jagged Wounds");
		this.ripDuration = 16 * 1000;
	}
	
	this.hasSabertooth = (playerInfo.talents[5].id == 202031);
	if(this.hasSabertooth) {
		console.log(playerName + " is specced for Sabertooth"); // but why are you specced for Sabertooth? >_>
	}
	
	this.noSabertoothRefreshPercent = 0.25;
	
	this.targets = new Map(); // from ID to FdsaTargetState

	/*
	 * Methodology:
	 * TODO 
	 */
	this.parse = function( wclEvent ) {
		let timestamp = wclEvent.timestamp;
		let targetId = this.getUniqueTargetId(wclEvent); // may be undefined
		
		// watch for Rip on new targets, we don't add target to analysis until it has been ripped.
		if(wclEvent.type === 'cast' && wclEvent.ability.guid === this.ripId && !this.targets.has(targetId)) {
			console.log("Rip on new target: " + targetId);
			this.targets.set(targetId, new FdsaTargetState(this.numSims, this.ripDuration));
		}
		
		// watch for a variety of things on already tracked targets
		if(this.targets.has(targetId)) {
			let spellId = wclEvent.ability.guid;
			let thisTargetState = this.targets.get(targetId);
			
			// use 'cast' to watch for single target ability application
			if(wclEvent.type === 'cast') {
				if(spellId == this.ripId) {
					console.log("Rip hit on " + targetId + " @" + Math.round(timestamp/1000));
					thisTargetState.applyRip(timestamp);
				} else if(this.cpIds.has(spellId)) {
					console.log("ST CP hit on " + targetId + " @" + Math.round(timestamp/1000));
					thisTargetState.applyCp(timestamp);
				}
				
			// use 'applydebuff' and 'refreshdebuff' to watch for AoE dot application and also AB application
			} else if(wclEvent.type === 'applydebuff' || wclEvent.type === 'refreshdebuff') {
				if(spellId === this.abId) {
					thisTargetState.applyAb(timestamp);
				} else if(this.dotAoeCpIds.has(spellId)) {
					console.log("Thrash hit on " + targetId + " @" + Math.round(timestamp/1000));
					thisTargetState.applyCp(timestamp);
				}
				
			// use 'damage' to watch for AoE direct damage application
			} else if(wclEvent.type === 'damage') {
				// check for FB refreshing Rip
				if(spellId === this.fbId) {
					let targetHpPercentBefore = (wclEvent.hitPoints + wclEvent.amount) / wclEvent.maxHitPoints;
					if(this.hasSabertooth || targetHpPercentBefore < this.noSabertoothRefreshPercent) {
						thisTargetState.refreshRip(timestamp);
					}
				} else if(this.directAoeCpIds.has(spellId)) {
					console.log("Swipe hit on " + targetId + " @" + Math.round(timestamp/1000));
					thisTargetState.applyCp(timestamp);
				}
				
			// use 'removedebuff' to watch for target death
			} else if(wclEvent.type === 'removedebuff') {
				if(spellId === this.ripId) {
					this.targets.get(targetId).handleDeath(timestamp);
				}
			}
		}
	}
	
	// Gets a unique string ID for an enemy target.
	// Enemies with same name have same targetID, must be distinguished by targetInstance.
	this.getUniqueTargetId = function( wclEvent ) {
		var res = wclEvent.targetID;
		if(wclEvent.targetInstance !== undefined) {
			res += "-" + wclEvent.targetInstance;
		}
		return res;
	}
	
	// target mapping key is 'id-instance', this unpacks that
	this.getTargetName = function( targetId ) {
		let idAndInstance = (""+targetId).split('-');
		let justId = parseInt(idAndInstance[0]);
		let res = enemyNameMapping.get(justId);
		if(idAndInstance.length == 2) {
			res += " (" + idAndInstance[1] + ")";
		}
		return res;
	}
	
	this.getResult = function() {
		var res = $('<div>', {"class":"panel panel-default"});
		
		var playerNameElement = $('<div>', {"class":"panel-heading"})
				.html(toColorHtml("<b>" + playerName + " 🐱</b>", this.druidOrangeColor))
				.appendTo(res);
		var targetListElement = $('<ul>', {"class":"list-group"})
				.appendTo(res);
				
		for(let[targetId, targetState] of this.targets.entries()) {
			console.log(this.getTargetName(targetId));
			let reportObj = targetState.report(fight.start_time, fight.end_time);
			
			$('<li>', {"class":"list-group-item small"})
					.html("<p><b>" + this.getTargetName(targetId) + "</b></p>" +
							"&emsp;Actual Rip Uptime: <b>" + reportObj.actualRipUptime + "%</b><br>" +
							"&emsp;Average Simmed AB Uptime: <b>" + reportObj.simmedAvgAbUptime + "%</b><br>" +
							"&emsp;Actual AB Uptime: <b>" + reportObj.actualAbUptime +
							"% (" + reportObj.actualAbPercentile + " percentile)</b><br>")
					.appendTo(targetListElement);
		}
		
		return res;
	}

}

// data structure holds the rip / AB / simmed-AB state of a target
function FdsaTargetState( numSims, ripDuration ) {
	this.abChance = 0.1;
	this.pandemicMult = 0.3;
	this.maxRipPandemic = ripDuration * this.pandemicMult;
	
	this.rip = new FdsaBleedState(true, "Rip");
	this.ab = new FdsaBleedState(true, "AB");
	this.simAbs = [numSims];
	for(var i=0; i<numSims; i++) {
		this.simAbs[i] = new FdsaBleedState(false, "");
	}
	
	// handles Rip being applied to target
	this.applyRip = function( time ) {
		let newFallsAt = time + ripDuration;
		this.rip.applyPandemic( time, newFallsAt, this.maxRipPandemic );
	}
	
	// handles Rip being refreshed on target, like with FB
	this.refreshRip = function( time ) { // FB within window
		let newFallsAt = time + ripDuration;
		this.rip.refreshPandemic( time, newFallsAt, this.maxRipPandemic );
	}
	
	// handles a CP ability being used on target (anything that could proc AB)
	this.applyCp = function( time ) {
		if(this.rip.isBleedUp()) { // CP on target only relevent if Rip is active
			for(var i=0; i<numSims; i++) {
				if(Math.random() < this.abChance) {
					this.simAbs[i].apply(time, this.rip.fallsAt);
				}
			}
		}
	}
	
	// handles an actual AB proc on target
	this.applyAb = function( time ) {
		this.rip.update(time);
		this.ab.apply( time, this.rip.fallsAt );
	}
	
	// handles the target dying (all DoTs drop immediately)
	this.handleDeath = function( time ) {
		this.rip.remove(time);
		this.ab.remove(time);
		for(let simAb of this.simAbs) {
			simAb.remove(time);
		}
	}
	
	// builds a 'reportobj' with data about Rip, AB, and simmed AB uptimes
	this.report = function( fightStartTime, fightEndTime ) {
		this.handleDeath(fightEndTime);
	
		let fightTime = fightEndTime - fightStartTime;
		let ripUptime = this.rip.accumDur / fightTime;
		let abUptime = this.ab.accumDur / fightTime;
	
		console.log("Actual Rip uptime: " + roundTo(ripUptime * 100, 1));
		console.log("Actual AB uptime: " + roundTo(abUptime * 100, 1));
		
		let averageAbSim = this.simAbs.reduce((a,v)=>v.accumDur+a, 0) / this.simAbs.length;
		let averageAbSimUptime = averageAbSim / fightTime;
		
		console.log("Simmed AB uptime: " + roundTo(averageAbSimUptime * 100, 1));
		
		let numSimsBelowActual = this.simAbs.filter(v => v.accumDur < this.ab.accumDur).length;
		let actualPercentile = Math.round(numSimsBelowActual / this.simAbs.length * 100);
		console.log("Actual AB percentile: " + actualPercentile);
		
		var reportObj = {};
		reportObj.actualRipUptime = roundTo(ripUptime * 100, 1);
		reportObj.actualAbUptime = roundTo(abUptime * 100, 1);
		reportObj.simmedAvgAbUptime = roundTo(averageAbSimUptime * 100, 1);
		reportObj.actualAbPercentile = Math.round(numSimsBelowActual / this.simAbs.length * 100);
		return reportObj;
	}
}

// tracks the state of a bleed
// evals its state 'lazily', meaning accumDur won't be updated until one of its functions is called
function FdsaBleedState( isVerbose, name ) {
	this.bleedUp = false;
	this.appliedAt = 0; // in millis since log start
	this.fallsAt = 0; // in millis since log start
	this.accumDur = 0; // in millis
	
	this.isBleedUp = function( time ) {
		this.update(time);
		return this.bleedUp;
	}
	
	this.update = function( time ) {
		if(this.bleedUp && time > this.fallsAt) {
			if(isVerbose){console.log(name + " fell @ " + Math.round(this.fallsAt/1000));} // debug logging
			this.bleedUp = false;
			this.accumDur += (this.fallsAt - this.appliedAt);
		} 
	}
	
	this.apply = function( time, newFallsAt ) {
		this.applyHelper(time, newFallsAt, 0, false);
	}
	
	this.applyPandemic = function( time, newFallsAt, maxPandemic) {
		this.applyHelper(time, newFallsAt, maxPandemic, false);
	}
	
	this.refresh = function( time, newFallsAt ) {
		this.applyHelper(time, newFallsAt, 0, true);
	}
	
	this.refreshPandemic = function( time, newFallsAt, maxPandemic) {
		this.applyHelper(time, newFallsAt, maxPandemic, true);
	}
	
	this.applyHelper = function( time, newFallsAt, maxPandemic, refreshOnly ) {
		this.update(time);
		if(this.bleedUp) {
			var remainingDur = this.fallsAt - time;
			if(remainingDur > maxPandemic) {
				this.fallsAt = newFallsAt + maxPandemic;
			} else {
				this.fallsAt = newFallsAt + remainingDur;
			}
			if(isVerbose){console.log(name + " refreshed @ " + Math.round(time/1000));} // debug logging
		} else if(!refreshOnly) {
			if(isVerbose){console.log(name + " applied @ " + Math.round(time/1000));} // debug logging
			this.bleedUp = true;
			this.appliedAt = time;
			this.fallsAt = newFallsAt;
		}
	}
	
	this.remove = function( time ) {
		this.update(time);
		if(this.bleedUp) {
			if(isVerbose){console.log(name + " removed @ " + Math.round(this.fallsAt/1000));} // debug logging
			this.bleedUp = false;
			this.accumDur += (time - this.appliedAt);
		}
	}
} 



