$(()=>start("elaimet"));

var puzzle = null;
var selectedInfo;
var eventsRegistered = false;
var selectedInput = null;

function start(category) {
	puzzle = createCrosswordPuzzle(category);
	drawPuzzle();
}
function drawPuzzle() {
	let tbl = $("#cw-tbody")
	tbl.html("");

	for (let y = -1; y <= puzzle.maxY; y++) {
		tbl.append("<tr id='tr" + y + "'>");
		let tr = $("#tr" + y);
		for(let x = -1; x <= puzzle.maxX; x++) {
			let letter = null;
			let tdClass = 'empty'
			let tdContent = "";
			let jsContent = "";
			for (let i = 0; i < puzzle.words.length; i++) {
				let word = puzzle.words[i];
				if (contains(word, x, y)) {
					letter = charAt(word, x, y);
					tdClass = 'letter'
					break;
				} else {
					for (let j = 0; j < puzzle.words.length; j++) {
						let w = puzzle.words[j];
						let targetX = w.d == 'H' ? x+1 : x;
						let targetY = w.d == 'V' ? y+1 : y;
						if (w.x == targetX && w.y == targetY) {
							letter = ""+(j+1);
							let data = {"letter":letter,"tip":w.tip,"x":x,"y":y,"targetX":targetX,"targetY":targetY};
							jsContent =  " data=\"" + JSON.stringify(data).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;") + "\"";
							tdClass = 'info'
							break;
						}
					}
				}
			}
			
			if (tdClass == 'letter') {
				tdContent = "<input class='letter' id='td_" + x + "_" + y +"' type='text' data='" + letter + "' autocomplete='off' autocorrect='off' autocapitalize='characters' spellcheck='false' inputmode='text' enterkeyhint='next'/>";
			} else if (tdClass == 'info') {
				tdContent = letter;
				jsContent+= 'data-bs-toggle="tooltip" data-bs-placement="right" title="Paina numerosta nähdäksesi vihjeen."';
			}
			tr.append("<td id='cell_" + x + "_" + y + "' class='" + tdClass + "'" + jsContent + ">" + tdContent + "</td>")
		}
	}
	if (!eventsRegistered) {
		eventsRegistered=true;
		$("#clueBtn").on("click", revealLetter);
		$("#checkBtn").on("click", checkAnswers);
		$("#clearBtn").on("click", ()=>{
			$("input.letter").val("").removeClass("correct wrong");
			$("#tip").html("");
			setGameBoardStatus(true);
		});
		$("#newGameBtn").on("click", newGame);
		$("a.dropdown-item").on("click", (event)=>{
			$("a.dropdown-item").removeClass("active");
			let elem = $(event.target); 
			elem.addClass("active");
			$("#categoryButton").html(elem.html());
			$("#newGameBtn").trigger("click");
		});
	}
	
	setGameBoardStatus(true);
	$("td.info").toArray().forEach(elem=>{
		var el = $(elem);
		if (el.html() == "1") {
			el.trigger("click");
		}
	});
	$("input.letter").on("click", activateCurrentWord);
	// Mobiilinäppäimistöt eivät anna luotettavaa keydown-event.key-arvoa, joten käytetään input-tapahtumaa
	$("input.letter").on("input", handleInput);
	$("input.letter").on("focus", (e)=>{ let t = e.target; setTimeout(()=>{ try { t.select(); } catch (err) {} }, 0); });
	$("input.letter").on("keydown", (e)=>{
		if (e.key == "Backspace" || e.key == "Delete") {
			$(e.target).removeClass("wrong correct");
		}
		let dirs = {"ArrowLeft":[-1,0], "ArrowRight":[1,0], "ArrowUp":[0,-1], "ArrowDown":[0,1]};
		let dir = dirs[e.key];
		if (dir) {
			e.preventDefault();
			moveFocus(e.target, dir[0], dir[1]);
		}
	});
	$('[data-bs-toggle="tooltip"]').tooltip(); // Bootstrapin tooltippien alustus
}

function newGame() {
	$("#tip").html("");
	start($("a.dropdown-item.active").attr("id"));
}
function activateCurrentWord(event) {
	selectedInput = event.target;
	let arr = event.target.id.split("_");
	let x = arr[1];
	let y = arr[2];
	let found = 0;
	let index = -1;
	for (let i = 0; i < puzzle.words.length; i++) {
		let word = puzzle.words[i];
		if (contains(word, x, y)) {
			index = i+1;
			found++;
		}
	}
	if (found == 1) {
		$("td.info").toArray().forEach(elem=>{
			var el = $(elem);
			if (el.html() == index) {
				// Päivitetään vihje ja korostus siirtämättä fokusta
				showTip(el.attr("data"), true);
			}
		});
	}
}
function revealLetter() {
	$("input.letter").removeClass("correct wrong");
	if (selectedInput) {
		let sel = $(selectedInput);
		sel.addClass("correct");
		sel.val(sel.attr("data"))
		changeValueAndMoveToNext({"key":sel.val(),"target":selectedInput});
	}
	checkWinCondition();
}
function checkAnswers() {
	let inputs = $("input.letter").toArray();
	for (let i = 0; i < inputs.length; i++) {
		let el = $(inputs[i]);
		if (el.val() && String(el.val()).length == 1) {
			el.addClass(el.val() == el.attr("data") ? "correct" : "wrong");
		}
	}
}
var moving = false;
function moveFocus(from, dx, dy) {
	if (moving || !from || !from.id) {
		return;
	}
	moving = true;
	try {
		let arr = from.id.split("_");
		let x = Number(arr[1]) + dx;
		let y = Number(arr[2]) + dy;
		let limit = 100;
		while (limit-- > 0 && x >= 0 && y >= 0 && x <= puzzle.maxX && y <= puzzle.maxY) {
			let next = document.getElementById("td_" + x + "_" + y);
			if (next && !next.disabled) {
				// Päivitetään korostus ja vihje ilman fokuksen siirtoa
				let found = [];
				for (let i = 0; i < puzzle.words.length; i++) {
					if (contains(puzzle.words[i], x, y)) {
						found.push(i + 1);
					}
				}
				if (found.length == 1 && String(found[0]) != String(selectedInfo)) {
					let info = $("td.info").toArray().find(el => $(el).html() == found[0]);
					if (info) {
						showTip($(info).attr("data"), true);
					}
				}
				selectedInput = next;
				next.focus();
				return;
			}
			x += dx;
			y += dy;
		}
	} finally {
		moving = false;
	}
}
function handleInput(event) {
	let el = event.target;
	let value = String(el.value || "");
	if (value.length == 0) {
		return;
	}
	let letter = Array.from(value).pop();
	if (/^[a-zA-ZåäöÅÄÖ]$/.test(letter)) {
		changeValueAndMoveToNext({"key": letter, "target": el});
	} else {
		el.value = "";
	}
}
function changeValueAndMoveToNext(event) {
	let re = /^[a-zA-ZåäöÅÄÖ]{1}$/;
	let letter = event.key;
	selectedInput = event.target;
	if (re.test(letter)) {
		if (event.preventDefault) {
			event.preventDefault();
		}
		$("input.letter").removeClass("correct");
		let input = $(event.target);
		input.removeClass("wrong");
		input.val(letter.toUpperCase());
		if (selectedInfo) {
			let arr = input.attr("id").split("_");
			let w = puzzle.words[selectedInfo -1];
			let x = arr[1];
			let y = arr[2];

			if (w.d == 'H' && x < w.x + w.word.length) {
				selectedInput = $("#td_" + (Number(x)+1) + "_" + y);
				selectedInput.trigger("focus");
			} else if (w.d == 'V' && y < w.y + w.word.length) {
				selectedInput = $("#td_" + x + "_" + (Number(y)+1));
				selectedInput.trigger("focus");
			}
		}
		checkWinCondition();
	}
}
function showTip(dataStr, skipFocus) {
	let data = JSON.parse(dataStr);
	$("td.info").removeClass("selected");
	$("input.letter").removeClass("active");
	$("#cell_" + data.x + "_" + data.y).addClass("selected");
	let input = $("#td_" + data.targetX + "_" + data.targetY);
	if (!skipFocus) {
		selectedInput = input;
		input.trigger("focus");
	}

	word = puzzle.words[(data.letter-1)];
	for (let i = 0; i <= word.word.length; i++) {
		let colX = (word.d == 'V') ? data.x : (data.x+i);
		let colY = (word.d == 'H') ? data.y : (data.y+i);
		$("#td_" + colX + "_" + colY).addClass("active");
	}

	let tip = $("#tip");
	selectedInfo = data.letter;
	tip.fadeOut(150, ()=> {
		tip.html(data.letter + ". " + data.tip);
		tip.fadeIn(150);
	});
}
function checkWinCondition() {
	let inputs = $("input.letter").toArray();
	let allCorrect = true;
	for (let i = 0; i < inputs.length; i++) {
		let el = $(inputs[i]);
		if (el.val() != el.attr("data")) {
			allCorrect = false;
			break;
		}
	}
	if (allCorrect) {
		$("input.letter").addClass("correct");
		$("#tip").html("KAIKKI SANAT OIKEIN!");
		setGameBoardStatus(false);
		flashTip(3);
	}
}
function flashTip(amount) {
	let tip = $("#tip");
		tip.fadeOut(350, ()=> {
			tip.fadeIn(350);
			if (amount > 1) {
				flashTip(amount-1);
			}
		});
}
function setGameBoardStatus(enabled) {
	$("input").prop("disabled", !enabled);
	if (!enabled) {
		$("td.info").off("click");
	} else {
		$("td.info").toArray().forEach((elem)=>{
			let el = $(elem);
			 el.on("click", ()=>{
				showTip(el.attr("data"), false);
			 });
		});
	}
}

function shuffle(array) {
    for (var i = array.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var temp = array[i];
        array[i] = array[j];
        array[j] = temp;
    }
}
function contains(word, x, y) {
	let iX = parseInt(x);
	let iY = parseInt(y);
	if (word.d == 'H') {
		return word.y == y && [...Array(word.word.length).keys()].map(i=>i+word.x).includes(iX);
	} else {
		return word.x == x && [...Array(word.word.length).keys()].map(i=>i+word.y).includes(iY);
	}
}
function charAt(word, x, y) {
	return word.d == 'H' ? word.word.charAt(x - word.x) : word.word.charAt(y - word.y);
}