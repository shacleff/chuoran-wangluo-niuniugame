/**
*  socket.io组件
*  先实例化new socketIoPlugin(), 再通过 ZR_IO 调用
*/
window._SocketIO_INSTANCE = window.ZR_IO = null;
window.currentSocketRoomParams = null; //默认加入房间的参数

let socketIoPlugin = function (roomParams, socketCb) {
    if (window._SocketIO_INSTANCE == null) {
        this.initSocketIo({ url: window.configData.socketServer.url });
        window._SocketIO_INSTANCE = this;
        window.currentSocketRoomParams = null;
    }

    window.currentSocketRoomParams = roomParams;
    window._SocketIO_INSTANCE.onReconnectCb(socketCb);

    window.ZR_IO = window._SocketIO_INSTANCE;
    return window._SocketIO_INSTANCE;
};

socketIoPlugin.prototype = {
    initSocketIo(socketOpts) {
        let self = this;

        let ioIsConnected = false; //1：可用，0不可用
        let socketIo = io.connect(socketOpts.url);
        let socketEventList = {};

        socketIo.eventCb = (eventName, eventCall) => {
            if(eventCall){
                socketEventList['event_' + eventName] = eventCall;
            }else{
                delete socketEventList['event_' + eventName];
            }
        };
        socketIo.myEmit = function (emitName, data) {
            if (!data || data.constructor != Object) {
                alert('ERROR-传递的数据类型必须为Object');
                return;
            }
            let sData = { emitName: emitName, data: data };
            socketIo.emit('socket.io', sData);
        };
        socketIo.on('socket.io-data', data => {
            console.log('socket.io-data', data);

            if (data.eventName && socketEventList['event_' + data.eventName]) {
                let result = data.data;
                // if (result && new RegExp(/^[{|\[]/).test(result)) {
                //     result = JSON.parse(result);
                // }
                socketEventList['event_' + data.eventName].call(null, result, result.__success);
            }
        });

        socketIo.on('connect', () => { //加组在此处理
            ioIsConnected = true;

            let roomParams = window.currentSocketRoomParams;

            console.log('connect', roomParams, typeof self.reconnectCb);

            // if (roomParams) {
            //     self.joinRoom(roomParams, (result,status) => {
            //         cc.info('加入房间：', result);
            //         self.reconnectCb && self.reconnectCb(true, result, status);
            //     });
            // } else {
            //     self.reconnectCb && self.reconnectCb(true);
            // }
        });

        socketIo.on('reconnect_attempt', () => {
            ioIsConnected = false;
            console.log('reconnect_attempt');

            if (self.reconnectCb) {
                self.reconnectCb(false);
            }
        });

        socketIo.on('reconnect', () => {
            console.log('reconnect');
        });
        socketIo.on('reconnecting', () => {
            console.log('reconnecting', arguments);
        });
        socketIo.on('reconnect_error', () => {
            console.log('reconnect_error');
        });
        socketIo.on('reconnect_failed', () => {
            console.log('reconnect_failed');
        });
        socketIo.on('ping', () => {
            console.log('ping', new Date());
        });
        socketIo.on('pong', () => {
            console.log('pong', new Date());
        });

        this.socketIo = socketIo;
    },
    onReconnectCb(reconnectCb) {
        this.reconnectCb = reconnectCb;
    },
    joinRoom(params, cb) {
        var eventCb = cb || function (data) {
            console.log('join_room_done', data);
        };
        this.__emit('join_room', params, eventCb, true);
    },
    __emit(emitEventName, data, emitCb, isJoinRoom){ //处理推送过滤
        cc.info('socket-emit', emitEventName);

        //加入房间时间控制
        if(emitEventName=='join_room' && !isJoinRoom){
            cc.error('join_room事件已作为为系统加入房间,请更换名称！！');
            return;
        }

        if (emitEventName) { //使用全局用户id，当前所在的游戏房间
            if(data == null){
                data = {};
            }
            if(typeof data == 'function'){
                emitCb = data;
                data = {};
            }

            data.playerId = GD.playerId;
            data.__hallItem = GD.current.hallItem; //场次信息
            data.__gameRoomKey = GD.gameRoomKey;
            data.__gameRoomType = GD.gameRoomType;
            data.__seatNum = GD.roomSeatNum;
            data.__token = GD.token;
            data.__exchangeRoomKey = GD.exchangeRoomKey;

            if(emitCb){ //默认接受当前的回调
                let cbEventName = emitEventName + '_' + Math.floor(Math.random()*10000);
                data.cbEventName = cbEventName;
                this.socketIo.eventCb(cbEventName, emitCb);
            }
            
            this.socketIo.myEmit(emitEventName, data);
        }
    },
    emit(emitEventName, data, emitCb) {
        this.__emit.apply(this,arguments);
    },

    on(onEventName, cb) {
        cc.info('socket-on', onEventName);

        if (onEventName) {
            this.socketIo.eventCb(onEventName, cb);
        }
    },

    destroy() {
        window._SocketIO_INSTANCE = window.ZR_IO = null;
        this.socketIo.destroy();
    },

    test_on() {
        this.on('emit-test', data => {
            console.log(data);
        });
    }
};

window.socketIoPlugin = socketIoPlugin;
window.initSocketIo = (roomParams, socketCb) => {
    new socketIoPlugin(roomParams, socketCb);
};