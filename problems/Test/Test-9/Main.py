import os
import sys
import json
import codecs
import inspect

class MyException(Exception):
	def __init__(self, value):
		self.value = value
		
	def __str__(self):
		return repr(self.value)
	

class Coord:
	def __init__(self, x, y, dir = ''):
		self.x = x
		self.y = y
		self.dir = dir

translateDirs = {
            'U': 'up',
            'D': 'down', 
            'L': 'left',
            'R': 'right'
}

def nextDirect(direct, curDir):
	if direct == 'forward':
		if curDir == 'up':
			return Coord(0, -1, 'up')
		if curDir == 'down':
			return Coord(0, 1, 'down')
		if curDir == 'left':
			return Coord(-1, 0, 'left')
		if curDir == 'right':
			return Coord(1, 0, 'right')
		if curDir == 'wait':
			return Coord(0, 0, 'forward')
	if direct == 'left':
		if curDir == 'up':
			return Coord(0, 0, 'left')
		if curDir == 'down':
			return Coord(0, 0, 'right')
		if curDir == 'left':
			return Coord(0, 0, 'down')
		if curDir == 'right':
			return Coord(0, 0, 'up')
		if curDir == 'wait':
			return Coord(-1, 0, 'left')
	if direct == 'right':
		if curDir == 'up':
			return Coord(0, 0, 'right')
		if curDir == 'down':
			return Coord(0, 0, 'left')
		if curDir == 'left':
			return Coord(0, 0, 'up')
		if curDir == 'right':
			return Coord(0, 0, 'down')
		if curDir == 'wait':
			return Coord(1, 0, 'right')
	if direct == 'wait':
		if curDir == 'up':
			return Coord(0, 0, 'up')
		if curDir == 'down':
			return Coord(0, 0, 'down')
		if curDir == 'left':
			return Coord(0, 0, 'left')
		if curDir == 'right':
			return Coord(0, 0, 'right')
		if curDir == 'wait':
			return Coord(0, 0, 'wait')
	if direct == 'behind':
		if curDir == 'up':
			return Coord(0, 1, 'up')
		if curDir == 'down':
			return Coord(0, -1, 'down')
		if curDir == 'left':
			return Coord(1, 0, 'left')
		if curDir == 'right':
			return Coord(-1, 0, 'right')
		if curDir == 'wait':
			return Coord(0, 0, 'forward')
	raise MyException('Invalid direction')


class Path:
	def __init__(self, dir, x, y, initCnt):
		self.dir = dir
		self.x = x
		self.y = y
		self.initCnt = initCnt
		self.cnt = 0

class Cell:
	def __init__(self, x = 0, y = 0, zIndex = 1, points = 0, dLife = 0):
		self.x = x
		self.y = y
		self.zIndex = zIndex
		self.points = points
		self.dLife = dLife

class Monster(Cell):
	def __init__(self, monster):
		Cell.__init__(self)
		try:
			self.path = []
			path = monster['path']
			self.x = path[0]['x']
			self.y = path[0]['y']
			self.zIndex = monster['zIndex'] if 'zIndex' in monster else 0
			self.points = 0
			self.dLife = 0
			self.looped = monster['looped']
			self.die = monster['die']
			for p in path:
				self.path.append(Path(p['dir'], p['x'], p['y'], p['initCnt']))
			self.index = 0
		except:
			raise MyException('Invalid format')
			
	def tryNextStep(self):
		dir = self.path[self.index].dir
		x1 = self.x
		y1 = self.y
		c = Coord(0, 0)
		if self.index == len(self.path) - 1 and self.path[self.index].cnt == self.path[self.index].initCnt:
			if not self.looped:
				return Coord(self.x, self.y)
			x1 = self.path[0].x
			y1 = self.path[0].y
			dir = self.path[0].dir
		elif self.path[self.index].cnt == self.path[self.index].initCnt:
			dir = self.path[self.index + 1].dir
		c = nextDirect('forward', translateDirs[dir])
		global curState
		if not curState.field[y1 + c.y][x1 + c.x].isWall:
			x1 += c.x
			y1 += c.y
		return Coord(x1, y1)

	def nextStep(self):
		c = Coord(0, 0)
		if self.index == len(self.path) - 1  and self.path[self.index].cnt == self.path[self.index].initCnt:
			if not self.looped:
				return
			self.index = 0
			for p in self.path:
				p.cnt = 0
		elif self.path[self.index].cnt == self.path[self.index].initCnt:
			self.index += 1
			self.path[self.index].cnt = 0
		c = nextDirect('forward', translateDirs[self.path[self.index].dir])
		global curState
		if not curState.field[self.y + c.y][self.x + c.x].isWall:
			self.y += c.y
			self.x += c.x
		self.path[self.index].cnt += 1

class Lock(Cell):
	def __init__(self, x, y):
		try:
			Cell.__init__(self, x, y, 11, 0, 0)
			self.locked = False
		except:
			raise MyException('Invalid format')

class Key(Cell):
	def __init__(self, x, y, l):
		try:
			Cell.__init__(self, x, y, 1, 0, 0)
			locks = [Lock() for i in range(l)]
			self.found = False
		except:
			raise MyException('Invalid format')


class Box(Cell):
	def __init__(self, x, y, box):
		try:
			Cell.__init__(self, x, y, box['zIndex'] if 'zIndex' in box else 2, 
				box['points'] if 'points' in box else 0,
				box['dLife'] if 'dLife' in box else 0)
		except:
			raise MyException('Invalid format')

class Prize(Cell):
	def __init__(self, x, y, prize):
		try:
			Cell.__init__(self, x, y, prize['zIndex'] if 'zIndex' in prize else 2, 
				prize['points'] if 'points' in prize else 0,
				prize['dLife'] if 'dLife' in prize else 0)
			self.found = False
		except:
			raise MyException('Invalid format')
			
class FieldElem:
	def __init__(self, x, y, isWall):
		self.x = x
		self.y = y
		self.isWall = isWall
		self.cells = []

	def mayPush(self, cell):
		if self.isWall:
			return False
		for c in self.cells:
			if c.zIndex >= cell.zIndex:
				return False
		return True

	def findCell(self, t):
		for cell in self.cells:
			if isinstance(cell, t):
				return cell

class State:
	def __init__(self, **kwargs):
		self.cur = Coord(0, 0)
		self.d = Coord(0, 0)
		self.arrowZIndex = 3

		self.dLife = kwargs.get('dLife', 0)
		self.life = kwargs.get('startLife', 0)
		self.pnts = kwargs.get('startPoints', 0)
		self.maxStep = kwargs.get('maxStep', 10000)
		self.maxCmdNum = kwargs.get('maxCmdNum', 10000)
		self.commandsFine = kwargs.get('commandsFine', 0)
		self.stepsFine = kwargs.get('stepsFine', 0)
		self.invalidDirectionFine = kwargs.get('invalidDirectionFine', 0)
		self.steps = 0
		self.cmdNum = 0

		self.map = kwargs.get('map', [])
		self.specSymbols = kwargs.get('specSymbols', [])
		self.keys = kwargs.get('keys', [])
		self.locks = kwargs.get('locks', [])
		self.movingElements = kwargs.get('movingElements', [])
		self.sol = kwargs.get('sol', '')

		self.numOfPrizes = 0
		self.curNumOfPrizes = 0
		
		self.dead = False

		self.curMap = []
		self.field = []
		self.monsters = []
		self.usedFunc ={'forward':[], 'left':[], 'right':[], 'wait':[]}
		
		for i in range(len(self.map)):
			self.curMap.append([])
			self.field.append([])
			for j in range(len(self.map[i])):
				obj = Cell()
				self.curMap[i].append(self.map[i][j])
				self.field[i].append(FieldElem(j, i, self.curMap[i][j] == '#'))
				if self.curMap[i][j] == 'R' or self.curMap[i][j] == 'U' or self.curMap[i][j] == 'D' or self.curMap[i][j] == 'L':
					self.cur = Coord(j, i, translateDirs[self.curMap[i][j]])
				for k in range(len(self.specSymbols)):
					if self.curMap[i][j] == self.specSymbols[k]['symbol']:
						if self.specSymbols[k]['action'] == 'eat':
							self.numOfPrizes += 1
							obj = Prize(j, i, self.specSymbols[k])
						else:
							obj = Box(j, i, self.specSymbols[k])
						self.field[i][j].cells.append(obj)

		for k in range(len(self.movingElements)):
			obj = Monster(self.movingElements[k])
			self.field[obj.y][obj.x].cells.append(obj)
			self.monsters.append(obj)
		for k in range(len(self.keys)):
			key = Key(self.keys[k]['x'], self.keys[k]['y'], len(self.locks[k]))
			self.field[key.y][key.x].cells.append(key)
			for j in range(len(self.locks[k])):
				lock = Lock(self.locks[k][j]['x'], self.locks[k][j]['y'])
				key.locks[j] = lock
				self.field[lock.y][lock.x].cells.append(lock)
				
	def getNextCoord(self, dir):
		newDir = nextDirect(dir, self.cur.dir);
		cX = self.cur.x + newDir.x;
		cY = self.cur.y + newDir.y;
		
		if  dir != 'forward' and dir != 'behind':
			cX += nextDirect('forward', newDir.dir).x;
			cY += nextDirect('forward', newDir.dir).y;
			
		return Coord(cX, cY)
				
	def getFieldElem(self, dir):
		newDir = nextDirect(dir, self.cur.dir);
		
		cX = self.cur.x + newDir.x;
		cY = self.cur.y + newDir.y;
		
		if  dir != 'forward' and dir != 'behind':
			cX += nextDirect('forward', newDir.dir).x;
			cY += nextDirect('forward', newDir.dir).y;
			
		return self.field[cY][cX];
		
	def labyrinthOverrun(self, x, y):
		return x < 0 or y < 0 or x >= len(self.field[0]) or y >= len(self.field)

global curState
def swap(arr, i, j):
	t = arr[i]
	arr[i] = arr[j]
	arr[j] = t

def sort(arr):
	for i in range(len(arr) - 1, -1, -1):
		for j in range(i):
			if arr[j].zIndex < arr[j + 1].zIndex:
				swap(arr, j, j + 1)

def nextStep(direct):
	global curState
	st = inspect.stack()
	if st[2][2] not in curState.usedFunc[st[1][3]]:
		curState.cmdNum += 1
		curState.usedFunc[st[1][3]].append(st[2][2])
	result = True
	try:
		c = nextDirect(direct, curState.cur.dir)
		dx = c.x
		dy = c.y
		#curState.cur.dir = c.dir
		curState.life += curState.dLife
		c_x = curState.cur.x + dx
		c_y = curState.cur.y + dy
		changeCoord = True
		if not(c_x < 0 or c_x >= len(curState.field[0]) or c_y < 0 or c_y >= len(curState.field)):
			elem = curState.field[c_y][c_x]
			if elem.isWall:
				changeCoord = False
			sort(elem.cells)
			for cell in elem.cells:
				if cell.x != c_x or cell.y != c_y:
					continue
				if isinstance(cell,  Lock) and cell.locked:
					changeCoord = False
					break
				if isinstance(cell, Monster):
					curState.dead = True
					raise MyException('Arrow is dead')
					
				if isinstance(cell, Box):
					tx = c_x + dx
					ty = c_y + dy
					f = tx < 0 or tx >= len(curState.field[0]) or ty < 0 or ty >= len(curState.field)
					if not f:
						el1 = curState.field[ty][tx]
						if el1.mayPush(cell):
							elem.cells.remove(cell)
							cell.x = tx
							cell.y = ty
							el1.cells.append(cell)
							curState.pnts += cell.points
							curState.life += cell.dLife
							continue
						else:
							changeCoord = False
					else:
						changeCoord = False
				if isinstance(cell, Prize) and not cell.found:
					cell.found = True
					curState.pnts += cell.points
					curState.life += cell.dLife
					curState.curNumOfPrizes += 1
					elem.cells.remove(cell)
					continue
				if isinstance(cell, Key) and not cell.found:
					cell.found = True
					for lock in cell.locks:
						lock.locked = False
						lock.zIndex = 0
					elem.cells.remove(cell)
					continue
		else:
			changeCoord = False
		if changeCoord:
			curState.cur.x = c_x
			curState.cur.y = c_y
			curState.cur.dir = c.dir
		else:
			curState.pnts -= curState.invalidDirectionFine

		for monster in curState.monsters:
			c1 = monster.tryNextStep()
			if (curState.field[c1.y][c1.x].mayPush(monster)):
				if c1.y == curState.cur.y and c1.x == curState.cur.x:
					curState.dead = True
					raise MyException('Arrow is dead')

				curState.field[monster.y][monster.x].cells.remove(monster)
				monster.nextStep()
				curState.field[monster.y][monster.x].cells.append(monster);
			else:
				monster.path[monster.index].cnt += 1
		if curState.life == 0 or curState.steps + 1 > curState.maxStep or curState.cmdNum == curState.maxCmdNum:
			curState.dead = True
			raise MyException('Arrow is dead')
			
		curState.steps += 1
	except MyException as e:
		raise e
	except Exception as e:
		raise MyException('Something bad happened in nextStep')
			

def forward(cnt = 1):
	for i in range(cnt):
		nextStep('forward')

def left(cnt = 1):
	for i in range(cnt):
		nextStep('left')

def right(cnt = 1):
	for i in range(cnt):
		nextStep('right')

def wait(cnt = 1):
	for i in range(cnt):
		nextStep('wait')

def objectPosition(object, direction):
	result = True
	dir = ''
	if direction == 'atTheLeft':
		dir = 'left'
	elif direction == 'atTheRight':
		dir = 'right'
	elif direction == 'inFrontOf':
		dir = 'forward'
	elif direction == 'behind':
		dir = 'behind'
	else:
		return False

	c = curState.getNextCoord(dir)
	if curState.labyrinthOverrun(c.x, c.y):
		return object == 'border'
		
	cell = curState.getFieldElem(dir)
	if object == 'wall':
		result = cell.isWall
	elif object == 'prize':
		result = cell.findCell(Prize) != None;
	elif object == 'box':
		result = cell.findCell(Box) != None;
	elif object == 'monster':
		result = cell.findCell(Monster) != None;
	elif object == 'lock':
		result = cell.findCell(Lock) != None;
	elif object == 'key':
		result = cell.findCell(Key) != None;
	else:
		return False
	return result

def isCompleted():
	return curState.numOfPrizes == curState.curNumOfPrizes
	
def solve():
	try:
		f = open('problem.json', 'r')
		s = f.read()
		problem = json.loads(s)
		f.close()
		if not 'map' in problem:
			raise MyException('Map is undefined')
		if 'keys' in problem:
			if  'locks' not in problem:
				raise MyException("Keys are defined, but locks cells aren't defined")
			if len(problem['keys']) != len(problem['locks']):
				raise MyException("Keys and locks length aren't equal")

		global curState
		curState = State(**problem)				
		sol = codecs.open('output.txt', 'r', 'utf-8').read()
		oldstdout = sys.stdout
		sys.stdout = open(os.devnull, 'w')
		exec(sol, {'forward': forward, 'left': left, 'right': right, 'wait': wait, 'objectPosition': objectPosition, 'isCompleted': isCompleted})
		sys.stdout = oldstdout
	except:
		sys.stdout = oldstdout
	print(curState.pnts - curState.stepsFine * curState.steps - curState.commandsFine * curState.cmdNum)
				
if __name__ == '__main__':
	sys.exit(solve())
