const _SOCKET_KEYS = {
	PLAYER: {
		UPDATE: 'player.update',
		OTHER_UPDATE: 'player.other_update',
	},
	ROOMS: {
		INFO: 'rooms.info',
		GET_PLAYERS: 'rooms.get_players',
		GET_ROOMS: 'rooms.get_rooms',
		ENTER: 'rooms.enter',
		LEAVE: 'rooms.leave',
	},
	ROOM: {
		INFO: 'room.info',
		GET_PLAYERS: 'room.get_players',
		ENTER: 'room.enter',
		LEAVE: 'room.leave',
		UPDATE: 'room.update',
		OTHER_UPDATE: 'room.other_update',
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
			if(!player.roomPanelId)
				player.handle.onUpdateInfo.remove(_onPlayerUpdateInfo);
			if(player.roomId)
				io.to(player.roomId).emit(SOCKET_KEYS.PLAYER.OTHER_UPDATE, player.getInfo());
			io.to(self.id).emit(SOCKET_KEYS.PLAYER.OTHER_UPDATE, player.getInfo());
		}
		player.onUpdateInfo = _onPlayerUpdateInfo;
		player.socketId = player._socketId;
		player.online = true;

		let socketId = player.socketId;
		let socket = getSocketById(socketId);
		if(socket){
			socket.join(self.id);
			socket.emit(SOCKET_KEYS.ROOMS.INFO, self.info);
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
		if(socket){
			socket.emit(SOCKET_KEYS.ROOMS.INFO, {});
			socket.leave(self.id);
		}
	}

	self.onPlayerEntered = function(player){
		player = player[0];
		
		if(player.socketId == player._socketId)
			return;
		
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
				socket.emit(SOCKET_KEYS.ROOM.INFO, room.getInfo());
				socket.emit(SOCKET_KEYS.ROOM.GET_PLAYERS, room.getPlayers());
			}
		}

		room.onUpdateInfo = function(){
			let info = room.getInfo();
			io.to(self.id).emit(SOCKET_KEYS.ROOM.OTHER_UPDATE, info);
			io.to(room.id).emit(SOCKET_KEYS.ROOM.UPDATE, info);
		}

		room.onAfterPlayerLeave = function(player){
			player = player[0];

			io.to(room.id).emit(SOCKET_KEYS.PLAYER.OTHER_UPDATE, player.getInfo());

			let socketId = player.socketId;
			let socket = getSocketById(socketId);
			if(socket){
				socket.join(self.id);
				socket.leave(room.id);
				socket.emit(SOCKET_KEYS.ROOM.INFO, []);
				socket.emit(SOCKET_KEYS.ROOMS.GET_PLAYERS, self.getPlayers())
				socket.emit(SOCKET_KEYS.ROOMS.GET_ROOMS, self.getRooms())
			}
		}

	}


	self.onAfterDestroyRoom = function(room){
		// io.to(self.id).emit(SOCKET_KEYS.ROOM.DESTROY, room[0].id)
	}

	return self;
}

module.exports = SocketAppBase;
