﻿function fillLabyrinth(problem){
	highlightOn(problem);
	var l = problem.tabIndex;
	$('#tdField' + l).append('<table id = "table_field' + l + '" class = "field"></table>');
	var table = $('#table_field' + l);
	for (var i = 0; i < problem.map.length; ++i){
		table.append('<tr id = "tr_field' + (l * 1000 + i) + '"></tr>');
		var tr = $('#tr_field' + (l * 1000 + i));
		for (var j = 0; j < problem.map[i].length; ++j){
			tr.append('<td id = "'+ (l * 10000 + i * 100 + j)+'"></td>');
			problem.map[i][j].draw();
		}
	}
}

function login(callback){
	logined = false;
	callScript(pathPref + 'f=login;login=' + curUser.login + ';passwd=' + curUser.passwd +';json=1;', function(data){
		if (data.status == 'ok')
			sid = data.sid;
		else{
			alert(data.message);
			return false;
		}
		if(curUser.jury){
			curUser.passwd = '';
			$('#password').attr('value', '');
		}
		logined = true;
		callback();
		return true;
	});
}

function showNewUser(){
	$('#userListDiv').empty();
	$('#userListDiv').append('<p>Текущий пользователь:</p>');
	$('#userListDiv').append('<p>' + curUser.name +'</p>');
	$('#userListDiv').append(
		'<button name="changeUser" id = "changeUser" class = "' + buttonClass + '">' + 
		'<span class="ui-button-text">Сменить пользователя</span></button>');
	$('#changeUser').click(changeUser);
}

function chooseUser(){
	logined = false;
	var user = $('#userList > input:checked');
	name = user[0].defaultValue;
	for (var i = 0; i < users.length; ++i){
		if (name == users[i].name){
			curUser = users[i];
			if (curUser.jury) {
				$("#enterPassword").bind("dialogbeforeclose", function(event, ui) {
					if (logined)
						showNewUser();
					$("#enterPassword").bind("dialogbeforeclose", function(event, ui){});
				});
				$('#enterPassword').dialog('open') ;
				for (var i = 0; i < problems.length; ++i)
					$('#forJury' + i).show();
			}
			else
				login(showNewUser);
			break;
		}
	}
}

function changeUser(){
	for (var i = 0; i < problems.length; ++i)
		$('#forJury' + i).hide();
	logined = false;
	callScript(pathPref +'f=logout;sid=' + sid + ';json=1;', function(){});
	sid = undefined;
	callScript(pathPref +'f=users;cid=' + cid + ';rows=100;json=1;', function(data){
		if (!data)
			return;
		curUser = new Object();
		users = [];
		for (var i = 0; i < data.length; ++i){
			if (data[i].ooc == 1)
				continue;
			users.push({'login': data[i].login, 'name': data[i].name, 'jury': data[i].jury, 'passwd': defaultPass}); 
		}
		$('#userListDiv').empty();
		if (users.length > 0){
			$('#userListDiv').append('<p>Выберите свое имя из списка</p>');
			$('#userListDiv').append('<form name = "userList" id = "userList">');
			for (var i = 0; i < users.length; ++i)
				$('#userList').append(
				'<input type="radio" name="user_name" id="user_name_' + i + '" value="' + users[i].name + '" ' + 
				(i == 0 ? 'checked': '') + ' class="radioinput" /><label for="user_name_' + i + '">' 
				+ users[i].name + '</label><br>');
			$('#userListDiv').append('</form>');
			$('#userListDiv').append('<button id = "userNameSubmit" class = "' + buttonClass + '"' + 
			'<span class="ui-button-text">Выбрать пользователя</span></button><br>');
			$('#userNameSubmit').click(chooseUser);
		}
		else 
			$('#userListDiv').append('<p>На данный момент нет доступных пользователей</p>');	
	});
}

function submit(data, sep, l, submitStr){
	if (atHome){
		callSubmit_('imcs.dvgu.ru', '/cats/main.pl?f=problems;sid=' + sid + ';cid=' + cid +';json=1;', submitStr, function(data){
			if (data.error == 'bad sid'){
				if (curUser.jury) {
					$('#enterPassword').dialog('title', 'sid устарел. Введите пароль снова');
					$('#enterPassword').dialog('open');
					if (confirm('Переотправить решение?'))
						submit(data, sep, l, submitStr);
				}					
				else
					login(function() {submit(data, sep, l, submitStr)});
			}
			alert('Решение отослано на проверку');
		});  
	}
	else
	callSubmit(pathPref + 'f=problems;sid=' + sid + ';cid=' + cid+ ';json=1;', data,'imcs.dvgu.ru', '/cats/main.pl?f=problems;sid=' 
			+ sid + ';cid=' + cid, sep, l, function(data){
		if (data.error == 'bad sid'){
			if (curUser.jury) {
				$('#enterPassword').dialog('title', 'sid устарел. Введите пароль снова');
				$('#enterPassword').dialog('open');
				if (confirm('Переотправить решение?'))
					submit(data, sep, l);
			}					
			else
				login(function() {submit(data, sep, l)});
		}
		alert('Решение отослано на проверку');
		//submit(data, sep, l);
	});
}

submitClick = function(){
	if (atHome){
		var result = commandsToJSON();
		submitStr = 'source=' + result + '&problem_id=' + curProblem.id + '&de_id=772264';
		submit('', '', '', submitStr);
	} 
	else {
		if (!logined) {
			alert('Невозможно отослать решение, так как не выбран пользователь');
			return false;
		}
		if (!sid){
			(curUser.jury) ? $('#enterPassword').dialog('open') : login();
		}
		var result = commandsToJSON();
		var problem_id = curProblem.id;  //problem_id = 
		var de_id = 772264;
		var boundary = Math.round((Math.random() * 999999999999));
		var sep = '-------------' + boundary + '\r\n';
		var l = 0;
		function genPostQuery(serv, path, data)	{
			var result = 'Content-Type: multipart/form-data, boundary=' + sep + '\r\n';
			result += 'Content-Length: ' + data.length + '\r\n\r\n';
			l = data.length;
			result += data;
			return result;
		}
		function genFieldData(name, value){
			var result = sep + 'Content-Disposition: form-data; name="' + name + '"' + "\r\n\r\n";
			result += value + '\r\n';
			return result;
		}
		function genFileFieldData(name, filename, type, data){
			var result = sep + 'Content-Disposition: form-data; name="' + name  +  '"; filename="' + filename + '"' + "\r\n";
			result += 'Content-Type: ' + type + "\r\n\r\n";
			result += data + '\r\n\r\n';
			return result;
		}
		var data = genFieldData('search', '');
		data += genFieldData('rows', '20');
		data += genFieldData('problem_id', problem_id);
		data += genFieldData('de_id', de_id);
		data += genFieldData('submit', 'send');
		data += genFileFieldData('source', 'ans.txt', 'text/plain', result);
		data += '-------------' + boundary  + '--\r\n';
		var query = genPostQuery('imcs.dvgu.ru', '/cats/main.pl?f=problems;sid=' + sid + ';cid=' + cid, data);
		submit(data, sep, l);
	}
}

function getContests(){
	callScript(pathPref + 'f=contests;filter=json;sort=1;sort_dir=0;json=1;', function(data){ ////
		if (!data)
			return;
		contests = data.contests;
		for (var i = 0; i < contests.length; ++i){
				$('#contestsList').append(
				'<input type="radio" name="contest_name" id="contest_name_' + i + '" value="' + contests[i].name + '" ' + 
				(i == 0 ? 'checked': '') + ' class="radioinput" /><label for="contest_name_' + i + '">' 
				+ contests[i].name + '</label><br>');
		}
		cid = contests[0].id;
	});
	fillTabs();
}

function clearTabs(){
	$('#tabs > div').each(function(index, elem){
		$(elem.id).empty();
		$('#tabs').tabs('remove', index);
	});
}

function changeContest(){
	var contest = $('#contestsList > input:checked');
	name = contest[0].defaultValue;
	for (var i = 0; i < contests.length; ++i){
		if (name == contests[i].name){
			if (cid != contests[i].id){
				cid = contests[i].id;
				clearTabs();
				fillTabs();
			}
			break;
		}
	}
}

function fillTabs(){
	if ($('#ui-tabs-0').length){
		$('#ui-tabs-0').empty();
		$('#tabs').tabs('remove', 0);
	}
	$('#tabs').tabs('add', '#ui-tabs-0', "Выбор пользователя", 0);
	$('#ui-tabs-0').append('<div id = "userListDiv"></div>');
	$('#ui-tabs-0').append('<button class="' + buttonClass +'" id = "changeContestBtn">' + 
									'<span class="ui-button-text">Выбрать турнир</span></button>');
	$('#changeContestBtn').click(function(){$('#changeContest').dialog('open'); return false; })
	changeUser();
	problems = [];
	callScript(pathPref + 'f=problem_text;notime=1;nospell=1;noformal=1;cid=' + cid + ';nokw=1;json=1', function(data){
		for (var i = 0; i < data.length; ++i){
			problems[i] = $.extend({}, data[i], data[i].data);
			problems[i].tabIndex = i;
			getTest(data[i].data, i);
			if ($('#ui-tabs-' + (i + 1)).length){
				$('#ui-tabs-' + (i + 1)).empty();
				$('#tabs').tabs('remove', i + 1);
			}
			$('#tabs').tabs('add', '#ui-tabs-' + (i + 1),problems[i].title, i + 1);
			$('#ui-tabs-' + (i + 1)).append('<table id = "main' + i + '">');
			mainT = $('#main' + i);
			mainT.append('<tr id = "1tr' + i +'">');
			$('#1tr' + i).append('<td colspan = "' + (problems[i].maxStep ? 1 : 2) +'" id = "tdSt' + 
								i + '" valign = "top">');
			$('#1tr' + i).append('</td>');
			if (problems[i].maxStep){
				$('#1tr' + i).append('<td align = "right"><table id = "tablePnts' + i + '"></table></td>')
				$('#tablePnts' + i).append('<tr><td id = "tdPnts' + i + '" valign = "top">');
				$('#tdPnts' + i).append('Затрачено шагов: <input class = "pnts" readonly id = "curStep' 
					+ i + '"> из ' + problems[i].maxStep);
				$('#1tr' + i).append('</td></tr>');
				$('#curStep' + i).attr('value', '0');
				$('#tablePnts' + i).append('<tr><td id = "tdProgressBar' + i + '" valign = "top">');
				$('#tdProgressBar' + i).append('<div id = "progressBar' + i + '"></div>');
				$('#progressBar' + i).progressbar({value: 0});
				$('#1tr' + i).append('</td></tr>');
			}
			$('#1tr' + i).append('<td valign = "top" align = "right" id = "tdAboutBtn' + i + '">');
			$('#tdAboutBtn' + i).append(
				'<button class="' + buttonClass +'" id = "aboutBtn' + i +'"></button>');
			$('#tdAboutBtn' + i).append('<div id = "forJury' + i + '"></div>');
			$('#forJury' + i).append('<button class="' + buttonClass +'" id = "exportBtn' + i +'"></button>');
			$('#forJury' + i).append('<button class="' + buttonClass +'" id = "importBtn' + i +'"></button>');
			$('#aboutBtn' + i).append('<span class="ui-button-text">?</span>');
			$('#exportBtn' + i).append('<span class="ui-button-text">export</span>');
			$('#importBtn' + i).append('<span class="ui-button-text">import</span>');
			$('#forJury' + i).append('<div id = "import' + i + '"></div>');
			$('#forJury' + i).append('<div id = "export' + i + '"></div>');
			$('#exportBtn' + i).click(function() { return exportCommands(); });
			$('#importBtn' + i).click(function() { return import_(); });
			$('#import' + i).append('<textarea rows = "20" cols = "20" id = "importText' + i + '></textarea>');
			$('#1tr' + i).append('</td>');
			mainT.append('</tr>');
			mainT.append('<tr id = "4tr' + i +'">');
			$('#4tr' + i).append('<td id = "tdBtns' + i + '" colspan = "2" valign = "top">');
			for (var j = 0; j < btns.length; ++j)
				$('#tdBtns' + i).append(
					'<input type = "button" class = "' + btns[j] + '" name = "btn_' + btns[j] +  i + 
					'" id = "btn_' + btns[j] + i + '" onClick = "' + btns[j] + 'Click()"></input>');
			$('#4tr' + i).append('</td>');
			$('#4tr' + i).append('<td id = "tdBtnSubmit' + i + '" valign = "top">');
			$('#tdBtnSubmit' + i).append(
				'<input type = "button" class = "clear" name = "btn_clear' + i + '" id = "btn_clear' 
				+ i + '" onClick = "clearClick()"></input>');
			$('#tdBtnSubmit' + i).append(
				'<input type = "button" align = "right" name="submit' + i + '" id = "submit' + i + 
				'" class = "submit" onClick = submitClick()></input>');
			$('#4tr' + i).append('</td>');
			mainT.append('</tr>');
			mainT.append('<tr id = "2tr'+ i +'">');	
			$('#2tr' + i).append('<td id = "tdCmd' + i + '" valign = "top" height = "100%">');				
			$('#tdCmd' + i).append('<ul class = "ul_comands" id = "ul_comands' + i + '">')
			var divs = problems[i].commands;
			for (var j = 0; j < divs.length; ++j){
				$('#ul_comands' + i).append('<li id = "' + divs[j] + i + '" class = "' + divs[j] + 
					'"><span style = "margin-left: 40px;">' + cmdClassToName[divs[j]] + '</span></li>');
				if($.browser.msie)
					$('#' + divs[j] + i).css('height', '35px');
			}
			$('#tdCmd' + i).append('</ul>');
			$('#2tr' + i).append('</td>');
			$('#2tr' + i).append('<td id = "tdField' + i + '" rowspan = "2" collspan = "2" valign = "top">');
			$('#2tr' + i).append('</td>');		
			$('#2tr' + i).append('<td id = "tdCons' + i + '" rowspan = "2" valign = "top">');
			$('#tdCons' + i).append('<textarea rows="34" cols="20" name="cons" id = "cons' + i + 
				'" class = "cons" disabled readonly></textarea><br>');
			$('#2tr' + i).append('</td>');		
			mainT.append('</tr>');
			mainT.append('<tr id = "3tr'+ i +'">');
			$('#3tr' + i).append('<td id = "tdDrop' + i + '" valign = "top">');
			$('#tdDrop' + i).append('<hr align = "left" width = "270px"><br>');
			$('#tdDrop' + i).append('Укажите последовательность действий');
			$('#tdDrop' + i).append('<table><tr><td><ul id = "sortable' + i + 
				'" class = "ui-sortable sortable"></ul></td></tr></table>')
			$('#3tr' + i).append('</td>');	
			mainT.append('</tr>');
			$('#ui-tabs-' + (i + 1)).append('</table>');
			fillLabyrinth(problems[i]);
			$('#tdSt' + i).append(problems[i].statement);
			$('#forJury' + i).hide();
		}
	});
	if ($('#ui-tabs-' + (problems.length + 1)).length){
		$('#ui-tabs-' + (problems.length + 1)).empty();
		$('#tabs').tabs('remove', (problems.length + 1));
	}
	$('#tabs').tabs('add', '#ui-tabs-' + (problems.length + 1), 'Результаты', (problems.length + 1));	
	$('#ui-tabs-' + (problems.length + 1)).append('<table class = "results"><tr><td>' + 
		'<iframe src = "' + resultsUrl + cid + ';" class = "results"></iframe></td></tr></table>');
}

function exportCommands(){
	$('#export' + curProblem.tabIndex).html(commandsToJSON());
	$('#export' + curProblem.tabIndex).dialog('open');
	return false;
}

function addCmd(name, cnt){
	$('#sortable' + curProblem.tabIndex).append('<li id = "' + name + cmdId + '" class = "' + name + ' ui-draggable">' + 
		'<span style = "margin-left: 40px;">' + cmdClassToName[name] + '</span></li>');		
	if($.browser.msie)
		$('#' + name + cmdId).css('height', '35px');
	$('#' + name + cmdId).attr('numId', cmdId);
	$('#' + name + cmdId).attr('ifLi', 1);
	$('#' + name + cmdId).append('<span align = "right" id = "spinDiv' + cmdId + '" class = "cnt"></span>');
	$('#spinDiv' + cmdId).append('<input class = "cnt"  id="spin' + cmdId + '" value="' + cnt + '" type="text"/>');
}

function setSpin(){
	$('#spinDiv' + cmdId).append('<input id = "spinCnt' + cmdId + '" class = "spinCnt" type="text">')
	$('#spin' + cmdId++).spin({
		min: 1,
		changed: function(){
			updated();			
		}
	});
}

function import_(){
	$('#import' + curProblem.tabIndex).dialog('open');
	return false;
}

function importCommands(){
	var cmds = jQuery.parseJSON($('#importText' + curProblem.tabIndex).attr('value'));
	if (cmds){
		$('#sortable' + curProblem.tabIndex).children().remove();
		for (var i = 0; i < cmds.length; ++i){
			addCmd(cmds[i].dir, cmds[i].cnt);
			setSpin();
		}
		updated();
		setDefault();
		setCounters(0);
	}
	$('#import' + curProblem.tabIndex).dialog('close');
}

function addNewCmd(str, dblClick, elem){
	if (dblClick)	
		addCmd(str, 1);
	else{
		$('#' + str + cmdId).append('<span align = "right" id = "spinDiv' + cmdId + '" class = "cnt"></span>');
		$('#spinDiv' + cmdId).append('<input class = "cnt"  id="spin' + cmdId + '" value="1" type="text"/>');
	}
	setSpin();
}

function hideCounters(){
	$('#sortable' + curProblem.tabIndex + ' > li > span > img').hide();			
	$('#sortable' + curProblem.tabIndex + ' > li > span > input').hide();
	var el = $('#sortable' + curProblem.tabIndex).children();
	while (el.length > 0){
		$('#spinCnt' + el.attr('numId')).show();
		el = el.next();
	}
}

function showCounters(){
	$('#sortable' + curProblem.tabIndex + ' > li > span > img').show();			
	$('#sortable' + curProblem.tabIndex + ' > li > span > input').show();
	var el = $('#sortable' + curProblem.tabIndex).children();
	while (el.length > 0){
		$('#spinCnt' + el.attr('numId')).hide();
		el = el.next();
	}
}

function enableButtons(){
	$('#sortable' + curProblem.tabIndex).sortable('enable');
	for (var i = 0; i < btnsPlay.length; ++i)
		$('#btn_' + btnsPlay[i] + curProblem.tabIndex).removeAttr('disabled');		
}

function disableButtons(){
	$('#sortable' + curProblem.tabIndex).sortable('disable');
	for (var i = 0; i < btnsPlay.length; ++i)
		$('#btn_' + btnsPlay[i] + curProblem.tabIndex).attr('disabled', 'disabled');
}

function callPlay(s){
	if (!$('#sortable' + curProblem.tabIndex).sortable('toArray').length || curProblem.arrow.dead)
		return;
	curProblem.paused = false;
	curProblem.stopped = false;
	disableButtons();
	hideCounters();
	setCounters(divI() + 1);
	curProblem.speed = s;
	setTimeout(function() { play(); }, s);
}

playClick = function(){
	callPlay(300);
}

fastClick = function(){
	cmdHighlightOff();
	callPlay(0);
}

clearClick = function(){
	if (!confirm('Вы уверены, что хотите очистить список команд?'))
		return;
	setDefault();
	$('#sortable' + curProblem.tabIndex).children().remove();
}

stopClick = function(){
	curProblem.stopped = true;
	setDefault();
	curProblem.playing = false;
	cmdHighlightOff();
	showCounters();
	setCounters();
}

pauseClick = function(){
	if (curProblem.playing)			
		curProblem.paused = true;
	enableButtons();
}

nextClick = function(){
	if ((divI() == list().length - 1 && cmd() == list()[divI()].cnt)){
		curProblem.divIndex = list().length;
		++curProblem.step;
		curProblem.cmdIndex = 0;
		return;
	}
	else
		if (divI() >= list().length)
			return;
	if (cmd() == 0 && divI() == 0)
		setCounters();
	disableButtons();
	hideCounters();
	curProblem.playing = true;
	curProblem.paused = false;
	curProblem.stopped = false;
	curProblem.speed = 0;
	if (divI() >= 1 && isCmdHighlighted(curProblem.cmdList[divI()- 1].name))
		changeCmdHighlight(curProblem.cmdList[divI()- 1].name);	
	loop(1);
	nextCmd();
}

prevClick = function(){
	var t = step();
	if (step() <= 1) {
		setDefault();
		showCounters();
		setCounters();
		return;
	}
	disableButtons();
	--t;
	setDefault(true);
	hideCounters();
	var s = curProblem.speed;
	curProblem.speed = 0;
	curProblem.playing = true;
	loop(t);
	nextCmd();
}