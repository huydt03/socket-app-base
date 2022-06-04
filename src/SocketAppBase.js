const _SOCKET_KEYS = {
	PLAYER: {
		UPDATE: 'player.update',
		OTHER_UPDATE: 'player.other_update',
	},
	ROOMS: {
		GET_PLAYERS: 'rooms.get_players',
		GET_ROOMS: 'rooms.get_rooms',
		ENTER: 'room.enter',
		LEAVE: 'room.leave',
	},
	ROOM: {
		GET_PLAYERS: 'room.get_players',
		CREATE: 'room.create',
		DESTROY: 'room.destroy',
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

		function _onPlayerUpdateInfo(){
			if(player.roomId)
				io.to(player.roomId).emit(SOCKET_KEYS.PLAYER.OTHER_UPDATE, player.getInfo());
			io.to(self.id).emit(SOCKET_KEYS.PLAYER.OTHER_UPDATE, player.getInfo());
		}
		player.handle.onUpdateInfo.remove(_onPlayerUpdateInfo);
		player.onUpdateInfo = _onPlayerUpdateInfo;
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
		io.to(self.id).emit(SOCKET_KEYS.ROOMS.ENTER, player.getInfo())
	}

	self.onAfterPlayerLeave = function(player){
		player = player[0];
		
		io.to(self.id).emit(SOCKET_KEYS.ROOMS.LEAVE, player.id)
		
		let socketId = player.socketId;
		let socket = getSocketById(socketId);
		if(socket){
			socket.leave(self.id);
		}
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

		io.to(self.id).emit(SOCKET_KEYS.ROOM.CREATE, room.getInfo())
		
		room.onAfterPlayerEnter = function(player){
			player = player[0];

			io.to(room.id).emit(SOCKET_KEYS.ROOM.ENTER, player.getInfo())

			let socketId = player.socketId;
			let socket = getSocketById(socketId);
			if(socket){
				socket.join(room.id);
				socket.leave(self.id);
				socket.emit(SOCKET_KEYS.ROOM.GET_PLAYERS, room.getPlayers());
			}
		}

		room.onUpdateInfo = function(){
			let info = room.getInfo();
			io.to(self.id).emit(SOCKET_KEYS.ROOM.UPDATE, info);
			io.to(room.id).emit(SOCKET_KEYS.ROOM.UPDATE, info);
		}

		room.onAfterPlayerLeave = function(player){
			player = player[0];

			io.to(room.id).emit(SOCKET_KEYS.ROOM.LEAVE, player.id)

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


	self.onAfterDestroyRoom = function(room){
		io.to(self.id).emit(SOCKET_KEYS.ROOM.DESTROY, room[0].id)
	}

	return self;
}

module.exports = SocketAppBase;
