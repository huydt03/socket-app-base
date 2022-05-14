const _SOCKET_KEYS = {
	PLAYER: {
		PROFILE: 'player.profile',
		OTHER_PROFILE: 'player.other_profile',
	},
	ROOMS: {
		GET_PLAYERS: 'rooms.get_players',
		GET_ROOMS: 'rooms.get_rooms'
	},
	ROOM: {
		GET_PLAYERS: 'room.get_players',
		CREATE: 'room.create',
		ENTER: 'room.enter',
		LEAVE: 'room.leave',
		UPDATE: 'room.update',
		KICKPLAYER: 'room.kickplayer'
	},
	ERROR: 'error',
	DISCONNECT: 'disconnect'
}

function SocketAppBase(io, RoomPanel, Socket_keys) {

	let self = RoomPanel;

	let SOCKET_KEYS = {..._SOCKET_KEYS, ...Socket_keys};

	function getSocketById(id){
		let socket = io.sockets.sockets.get(id);
		return socket;
	}

	self.onAfterPlayerEnter = function(_player){
		let player = _player[0];

		function _onAfterPlayerEnter(){
			if(player.roomId)
				io.to(player.roomId).emit(SOCKET_KEYS.PLAYER.OTHER_PROFILE, player.getInfo())
			io.to(self.id).emit(SOCKET_KEYS.PLAYER.OTHER_PROFILE, player.getInfo())
		}
		player.handle.onUpdateInfo.remove(_onAfterPlayerEnter);
		player.onUpdateInfo = _onAfterPlayerEnter;
		player.socketId = player._socketId;
		player.online = true;

		let socketId = player.socketId;
		let socket = getSocketById(socketId);
		if(socket){
			socket.join(self.id);
			if(room = self.getRoom(player.roomId))
				room.playerEnter(player)
			else{
				socket.emit(SOCKET_KEYS.ROOMS.GET_ROOMS, self.getRooms());
				socket.emit(SOCKET_KEYS.ROOMS.GET_PLAYERS, self.getPlayers());
			}
		}
	}

	self.onAfterPlayerLeave = function(player){
		player = player[0];
		let socketId = player.socketId;
		let socket = getSocketById(socketId);
		if(socket)
			socket.leave(self.id);
	}

	self.onPlayerEntered = function(player){
		player = player[0];
		let socketId = player.socketId;
		let socket = getSocketById(socketId);
		if(socket){
			socket.emit(SOCKET_KEYS.OTHER_CONNECT);
			socket.disconnect();
		}
	}

	self.onAfterAddRoom = function(_room){
		let room = _room[0];
		
		room.onAfterPlayerEnter = function(player){
			player = player[0];
			let socketId = player.socketId;
			let socket = getSocketById(socketId);
			if(socket){
				socket.join(room.id);
				socket.leave(self.id);
				socket.emit(SOCKET_KEYS.ROOM.GET_PLAYERS, room.getPlayers());
			}
		}

		room.onAfterPlayerLeave = function(player){
			io.to(room.id).emit(SOCKET_KEYS.PLAYER.OTHER_PROFILE, player[0].getInfo());
		}

		room.onUpdateInfo = function(){
			let info = room.getInfo();
			io.to(self.id).emit(SOCKET_KEYS.ROOM.UPDATE, info);
			io.to(room.id).emit(SOCKET_KEYS.ROOM.UPDATE, info);
		}

		room.onAfterPlayerLeave = function(player){
			player = player[0];
			let socketId = player.socketId;
			let socket = getSocketById(socketId);
			if(socket){
				socket.join(self.id);
				socket.leave(room.id);
				socket.emit(SOCKET_KEYS.ROOMS.GET_PLAYERS, self.getPlayers())
				socket.emit(SOCKET_KEYS.ROOMS.GET_ROOMS, self.getRooms())
			}
		}
	}

	return self;
}

module.exports = SocketAppBase;