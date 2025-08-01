import WebSocketManager from '../utils/websocket.js';

class LLOneBotAPI {
  constructor() {
    this.wsManager = new WebSocketManager();
  }

  // 连接WebSocket
  async connect() {
    return this.wsManager.connect();
  }

  // 断开连接
  disconnect() {
    this.wsManager.disconnect();
  }

  // 设置连接状态变化回调
  setConnectionChangeCallback(callback) {
    this.wsManager.setConnectionChangeCallback(callback);
  }

  // 设置消息回调
  setMessageCallback(callback) {
    this.wsManager.setMessageCallback(callback);
  }

  // 获取连接状态
  isConnected() {
    return this.wsManager.isConnected;
  }

  // 获取群列表
  async getGroupList() {
    return this.wsManager.sendRequest('get_group_list', { no_cache: true });
  }

  // 获取好友列表（带分组）
  async getFriendsWithCategory() {
    return this.wsManager.sendRequest('get_friends_with_category');
  }

  // 发送群消息
  async sendGroupMessage(groupId, message) {
    const formattedMessage = this.formatMessage(message);
    console.log(`📤 发送群消息 (${groupId}):`, formattedMessage);
    return this.wsManager.sendRequest('send_group_msg', {
      group_id: groupId,
      message: formattedMessage
    });
  }
  // 发送群视频消息
  async sendGroupVideoMessage(groupId, message) {
    const formattedMessage = this.formatMessage(message);
    console.log(`📤 发送群消息 (${groupId}):`, formattedMessage);
    return this.wsManager.sendRequest('send_group_msg', {
      group_id: groupId,
      message: formattedMessage
    });
  }

  // 发送私聊消息
  async sendPrivateMessage(userId, message) {
    const formattedMessage = this.formatMessage(message);
    console.log(`📤 发送私聊消息 (${userId}):`, formattedMessage);
    return this.wsManager.sendRequest('send_private_msg', {
      user_id: userId,
      message: formattedMessage
    });
  }
  // 发送私聊视频消息
  async sendPrivateVideoMessage(userId, message) {
    const formattedMessage = this.formatMessage(message);
    console.log(`📤 发送私聊消息 (${userId}):`, formattedMessage);
    return this.wsManager.sendRequest('send_private_msg', {
      user_id: userId,
      message: formattedMessage
    });
  }

  // 格式化消息
  formatMessage(message) {
    if (typeof message === 'string') {
      return [{ type: 'text', data: { text: message } }];
    }

    if (Array.isArray(message)) {
      return message;
    }

    // 支持文字+图片+视频+文件的混合消息
    const messageArray = [];

    if (message.text) {
      messageArray.push({
        type: 'text',
        data: { text: message.text }
      });
    }

    if (message.images && Array.isArray(message.images)) {
      message.images.forEach(image => {
        // 直接使用base64格式，这是最可靠的方式
        let filePath;
        if (image.data) {
          // 确保使用正确的base64格式
          const base64Data = image.data.includes(',') ? image.data.split(',')[1] : image.data;
          filePath = `base64://${base64Data}`;
        } else {
          filePath = image; // 原始数据
        }

        messageArray.push({
          type: 'image',
          data: { file: filePath }
        });
      });
    }

    if (message.videos && Array.isArray(message.videos)) {
      message.videos.forEach(video => {
        // 直接使用base64格式，这是最可靠的方式
        let filePath;
        if (video.data) {
          // 确保使用正确的base64格式
          const base64Data = video.data.includes(',') ? video.data.split(',')[1] : video.data;
          filePath = `base64://${base64Data}`;
        } else {
          filePath = video; // 原始数据
        }

        messageArray.push({
          type: 'video',
          data: { file: filePath }
        });
      });
    }

    return messageArray;
  }

  // 获取登录号信息
  async getLoginInfo() {
    return this.wsManager.sendRequest('get_login_info');
  }

  // 获取Bot状态
  async getBotStatus() {
    return this.wsManager.sendRequest('get_status');
  }

  // 上传私聊文件
  async uploadPrivateFile(userId, file, name) {
    return this.wsManager.sendRequest('upload_private_file', {
      user_id: userId,
      file: file,
      name: name
    });
  }

  // 上传群文件
  async uploadGroupFile(groupId, file, name, folderId = null) {
    const params = {
      group_id: groupId,
      file: file,
      name: name
    };

    if (folderId) {
      params.folder_id = folderId;
    }

    return this.wsManager.sendRequest('upload_group_file', params);
  }
}

export default LLOneBotAPI;
