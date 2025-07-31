import { v4 as uuidv4 } from 'uuid';

class WebSocketManager {
  constructor() {
    this.ws = null;
    this.url = 'ws://127.0.0.1:3001';
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectInterval = 3000;
    this.listeners = new Map();
    this.pendingRequests = new Map();
    this.onConnectionChange = null;
    this.onMessage = null;
  }

  // 连接WebSocket
  connect() {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.url);
        
        this.ws.onopen = () => {
          console.log('WebSocket连接成功');
          this.isConnected = true;
          this.reconnectAttempts = 0;
          this.onConnectionChange?.(true);
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            this.handleMessage(data);
          } catch (error) {
            console.error('解析消息失败:', error);
          }
        };

        this.ws.onclose = () => {
          console.log('WebSocket连接关闭');
          this.isConnected = false;
          this.onConnectionChange?.(false);
          this.handleReconnect();
        };

        this.ws.onerror = (error) => {
          console.error('WebSocket错误:', error);
          this.isConnected = false;
          this.onConnectionChange?.(false);
          reject(error);
        };

      } catch (error) {
        reject(error);
      }
    });
  }

  // 处理消息
  handleMessage(data) {
    // 如果有echo字段，说明是API响应
    if (data.echo) {
      const request = this.pendingRequests.get(data.echo);
      if (request) {
        this.pendingRequests.delete(data.echo);
        if (data.status === 'ok') {
          request.resolve(data.data);
        } else {
          request.reject(new Error(data.message || '请求失败'));
        }
      }
    } else {
      // 事件消息
      this.onMessage?.(data);
    }
  }

  // 发送API请求
  sendRequest(action, params = {}) {
    return new Promise((resolve, reject) => {
      if (!this.isConnected) {
        reject(new Error('WebSocket未连接'));
        return;
      }

      const echo = uuidv4();
      const message = {
        action,
        params,
        echo
      };

      this.pendingRequests.set(echo, { resolve, reject });
      
      // 设置超时
      setTimeout(() => {
        if (this.pendingRequests.has(echo)) {
          this.pendingRequests.delete(echo);
          reject(new Error('请求超时'));
        }
      }, 10000);

      this.ws.send(JSON.stringify(message));
    });
  }

  // 重连逻辑
  handleReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`尝试重连 (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
      
      setTimeout(() => {
        this.connect().catch(() => {
          // 重连失败，继续尝试
        });
      }, this.reconnectInterval);
    } else {
      console.error('达到最大重连次数，停止重连');
    }
  }

  // 断开连接
  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.isConnected = false;
    this.pendingRequests.clear();
  }

  // 设置连接状态变化回调
  setConnectionChangeCallback(callback) {
    this.onConnectionChange = callback;
  }

  // 设置消息回调
  setMessageCallback(callback) {
    this.onMessage = callback;
  }
}

export default WebSocketManager;
