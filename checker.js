﻿	function checkCell(i){
		life[curProblem] += problems[curProblem].d_life;
		var c_x = curX[curProblem] + dx[curProblem];
		var c_y = curY[curProblem] + dy[curProblem];
		for (var k = 0; k < problems[curProblem].cleaner.length; ++k){
			if (problems[curProblem].cleaner[k].x == c_x && problems[curProblem].cleaner[k].y == c_y)
				for (var l = 0; l < problems[curProblem].cleaned[k].length; ++l){
					s = '#' + (curProblem* 10000 + c_y * 100 + c_x);
					$(s).empty();
					var y = problems[curProblem].cleaned[k][l].y;
					var x = problems[curProblem].cleaned[k][l].x
					s = '#' + (curProblem* 10000 + y * 100 + x);
					$(s).empty();
					if ($(s).hasClass('floor'))
						break;
					$(s).addClass("floor");
					$("#cons" + curProblem).append("Шаг " + i + ": Открыли ячейку с координатами " + x + ", " + y + "\n");
					curMap[curProblem][y][x] = '.';
				}
		}
		for (var k = 0; k < movingElems[curProblem].symbol.length; ++k){
			if (curI[curProblem] >= movingElems[curProblem].path[k].length && !movingElems[curProblem].looped[k])
				continue;
			var j = (i - 1) % movingElems[curProblem].path[k].length;
			var x = movingElems[curProblem].path[k][j].x;
			var y = movingElems[curProblem].path[k][j].y;
			curMap[curProblem][y][x] = map[curProblem][y][x];
			s = "#" + (curProblem* 10000 + y * 100 + x);
			$(s).empty();
			if (curMap[curProblem][y][x] != "." && curMap[curProblem][y][x] != "#")
				for (var j = 0; j < specSymbols[curProblem].list.length; ++j)
					if (specSymbols[curProblem].list[j] == curMap[curProblem][y][x]){
						s = "#" + (curProblem* 10000 + y * 100 + x);
						$(s).empty();
						$(s).append("<div class = '" + specSymbols[curProblem].style_list[j] + "'></div>");
					}
			j = i % movingElems[curProblem].path[k].length;
			x = movingElems[curProblem].path[k][j].x;
			y = movingElems[curProblem].path[k][j].y;
			curMap[curProblem][y][x] = k + "";
			if (curMap[curProblem][y][x] == "#")
				alert("Движущийся объект уткнулся в стенку");
			s = "#" + (curProblem* 10000 + y * 100 + x);
			$(s).empty();
			$(s).append("<div class = '" + movingElems[curProblem].style[k] + "'></div>");
		}
		if (curMap[curProblem][c_y][c_x][0] >= '0' && curMap[curProblem][c_y][c_x][0] <= '9'){
			if (movingElems[curProblem].die[curMap[curProblem][c_y][c_x]]){
				$("#cons" + curProblem).append("Вас съели. Попробуйте снова \n");
				s = "#" + (curProblem* 10000 + cur_y * 100 + curX);
				$(s).empty();
				dead[curProblem] = true;
				return false;
			}
			life[curProblem] += movingElems[curProblem].d_life[curMap[curProblem][c_y][c_x]];
			pnts[curProblem] += movingElems[curProblem].points[curMap[curProblem][c_y][c_x]];
		}
		for (var k = 0; k < specSymbols[curProblem].list.length; ++k){
			if (curMap[curProblem][c_y][c_x] == specSymbols[curProblem].list[k]){
				++specSymbols[curProblem].cur_count[k];
				switch(specSymbols[curProblem]["do"][k]){
					case "eat":
						if (specSymbols[curProblem].cur_count[k] == specSymbols[curProblem].count[k])
							$("#cons" + curProblem).append("Шаг " + i + ": Нашли все артефакты '" + specSymbols[curProblem].names[k] + "' \n");
						else
							$("#cons" + curProblem).append("Шаг " + i + ": Нашли артефакт '" +specSymbols[curProblem].names[k] + "', " + specSymbols[curProblem].cur_count[k] +"-й \n");
							break;
					case "move": //ящик, сможем пододвинуть, если за ним пусто
						var t_x = c_x + dx;
						var t_y = c_y + dy;
						if (curMap[curProblem][t_y][t_x] != '.'){
							$("#cons" + curProblem).append("Шаг " + i + ": Не можем пододвинуть \n");
							return false;
						}
						else{
							s = '#' + (curProblem* 10000 + t_y * 100 + t_x);
							$(s).empty();
							$(s).append("<div class = '" + specSymbols.style_list[k] + "'></div>");
							curMap[curProblem][t_y][t_x] = curMap[curProblem][c_y][c_x];
						}
				}
				curMap[curProblem][c_y][c_x] = '.';
				s = '#' + (curProblem* 10000 + c_y * 100 + c_x);
				$(s).empty();
				life[curProblem] += specSymbols[curProblem].d_life[k];
				pnts[curProblem] += specSymbols[curProblem].points[k];
				break;
			}
		}
		if (life[curProblem] == 0){
			$("#cons" + curProblem).append("Количество жизней = 0. Попробуйте снова \n");
			dead[curProblem] = true;
			return false;
		}
		return true;
	}