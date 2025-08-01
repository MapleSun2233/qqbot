import { useState } from 'react';
import {
  Card,
  Input,
  Upload,
  Button,
  Space,
  Typography,
  Image,
  Tag,
  message as antMessage,
  Tabs,
  InputNumber,
  Divider,
  List,
  Popconfirm
} from 'antd';
import {
  DeleteOutlined,
  FileImageOutlined,
  VideoCameraOutlined,
  FileOutlined,
  PlayCircleOutlined,
  PlusOutlined,
  ClockCircleOutlined,
  CopyOutlined,
  OrderedListOutlined
} from '@ant-design/icons';

const { TextArea } = Input;
const { Title, Text } = Typography;
const { TabPane } = Tabs;

const MessageEditor = ({ value, onChange, disabled }) => {
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewImage, setPreviewImage] = useState('');
  const [activeTab, setActiveTab] = useState('0');

  // 确保value是数组格式，如果是旧格式则转换
  const ensureArrayFormat = (val) => {
    if (!val) return { messages: [{ text: '', images: [], videos: [], files: [] }], messageInterval: 3 };
    if (Array.isArray(val)) {
      // 旧格式兼容
      return { messages: [val], messageInterval: 3 };
    }
    if (val.messages && Array.isArray(val.messages)) {
      return val;
    }
    // 单个消息对象转换为数组
    return {
      messages: [{
        text: val.text || '',
        images: val.images || [],
        videos: val.videos || [],
        files: val.files || []
      }],
      messageInterval: val.messageInterval || 3
    };
  };

  const currentValue = ensureArrayFormat(value);
  const messages = currentValue.messages;
  const messageInterval = currentValue.messageInterval;

  // 更新消息数组
  const updateMessages = (newMessages, newInterval = messageInterval) => {
    onChange({
      messages: newMessages,
      messageInterval: newInterval
    });
  };

  // 检查消息是否包含文本/图片/视频内容
  const hasTextImageVideo = (message) => {
    return (message.text && message.text.trim() !== '') || 
           (message.images && message.images.length > 0) || 
           (message.videos && message.videos.length > 0);
  };

  // 检查消息是否包含文件
  const hasFiles = (message) => {
    return message.files && message.files.length > 0;
  };

  // 处理文本变化
  const handleTextChange = (e, messageIndex) => {
    const newMessages = [...messages];
    const currentMessage = { ...newMessages[messageIndex] };
    
    // 如果已有文件，不能再添加文本
    if (hasFiles(currentMessage) && e.target.value.trim() !== '') {
      antMessage.warning('当前消息已包含文件，无法同时添加文本内容。请删除文件后再试。');
      return;
    }
    
    currentMessage.text = e.target.value;
    newMessages[messageIndex] = currentMessage;
    updateMessages(newMessages);
  };

  // 添加新消息
  const addMessage = () => {
    const newMessages = [...messages, { text: '', images: [], videos: [], files: [] }];
    updateMessages(newMessages);
    setActiveTab(String(newMessages.length - 1));
  };

  // 删除消息
  const removeMessage = (index) => {
    if (messages.length <= 1) {
      antMessage.warning('至少需要保留一条消息');
      return;
    }
    const newMessages = messages.filter((_, i) => i !== index);
    updateMessages(newMessages);
    // 调整当前选中的tab
    const currentIndex = parseInt(activeTab);
    if (currentIndex >= newMessages.length) {
      setActiveTab(String(newMessages.length - 1));
    } else if (currentIndex > index) {
      setActiveTab(String(currentIndex - 1));
    }
  };

  // 复制消息
  const copyMessage = (index) => {
    const messageToCopy = { ...messages[index] };
    const newMessages = [...messages];
    newMessages.splice(index + 1, 0, messageToCopy);
    updateMessages(newMessages);
    setActiveTab(String(index + 1));
  };

  // 处理消息间隔变化
  const handleIntervalChange = (value) => {
    updateMessages(messages, value || 3);
  };

  // 处理文件上传
  const handleFileUpload = (info, fileType, messageIndex) => {
    const { file } = info;

    // 由于我们设置了beforeUpload返回false，文件不会自动上传
    // 所以我们直接处理原始文件对象
    const targetFile = file.originFileObj || file;

    if (targetFile) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const fileData = {
          name: targetFile.name,
          size: targetFile.size,
          type: targetFile.type,
          data: e.target.result,
          lastModified: targetFile.lastModified
        };

        const newMessages = [...messages];
        const currentMessage = { ...newMessages[messageIndex] };

        // 检查是否违反互斥规则
        if (fileType === 'file' && hasTextImageVideo(currentMessage)) {
          antMessage.warning('当前消息已包含文本/图片/视频，无法同时添加文件。请删除文本/图片/视频后再试。');
          return;
        }
        
        if (fileType !== 'file' && hasFiles(currentMessage)) {
          antMessage.warning('当前消息已包含文件，无法同时添加文本/图片/视频。请删除文件后再试。');
          return;
        }

        if (fileType === 'image') {
          currentMessage.images = [...(currentMessage.images || []), fileData];
          antMessage.success(`已添加图片: ${targetFile.name}`);
        } else if (fileType === 'video') {
          currentMessage.videos = [...(currentMessage.videos || []), fileData];
          antMessage.success(`已添加视频: ${targetFile.name}`);
        } else if (fileType === 'file') {
          currentMessage.files = [...(currentMessage.files || []), fileData];
          antMessage.success(`已添加文件: ${targetFile.name}`);
        }

        newMessages[messageIndex] = currentMessage;
        updateMessages(newMessages);
      };
      reader.readAsDataURL(targetFile);
    }
  };

  // 删除文件
  const handleFileRemove = (fileIndex, fileType, messageIndex) => {
    const newMessages = [...messages];
    const currentMessage = { ...newMessages[messageIndex] };

    if (fileType === 'image') {
      currentMessage.images = currentMessage.images.filter((_, i) => i !== fileIndex);
    } else if (fileType === 'video') {
      currentMessage.videos = currentMessage.videos.filter((_, i) => i !== fileIndex);
    } else if (fileType === 'file') {
      currentMessage.files = currentMessage.files.filter((_, i) => i !== fileIndex);
    }

    newMessages[messageIndex] = currentMessage;
    updateMessages(newMessages);
  };

  // 预览图片
  const handlePreview = (image) => {
    setPreviewImage(image);
    setPreviewVisible(true);
  };

  // 上传前检查
  const beforeUpload = (file, fileType, messageIndex) => {
    const currentMessage = messages[messageIndex];
    
    // 检查是否违反互斥规则
    if (fileType === 'file' && hasTextImageVideo(currentMessage)) {
      antMessage.warning('当前消息已包含文本/图片/视频，无法添加文件。请删除文本/图片/视频后再试。');
      return false;
    }
    
    if (fileType !== 'file' && hasFiles(currentMessage)) {
      antMessage.warning('当前消息已包含文件，无法添加文本/图片/视频。请删除文件后再试。');
      return false;
    }

    if (fileType === 'image') {
      const isImage = file.type.startsWith('image/');
      if (!isImage) {
        antMessage.error('只能上传图片文件！');
        return false;
      }
      const isLt10M = file.size / 1024 / 1024 < 10;
      if (!isLt10M) {
        antMessage.error('图片大小不能超过10MB！');
        return false;
      }
    } else if (fileType === 'video') {
      const isVideo = file.type.startsWith('video/');
      if (!isVideo) {
        antMessage.error('只能上传视频文件！');
        return false;
      }
      const isLt100M = file.size / 1024 / 1024 < 100;
      if (!isLt100M) {
        antMessage.error('视频大小不能超过100MB！');
        return false;
      }
    } else if (fileType === 'file') {
      const isLt50M = file.size / 1024 / 1024 < 50;
      if (!isLt50M) {
        antMessage.error('文件大小不能超过50MB！');
        return false;
      }
    }

    return false; // 阻止自动上传，手动处理
  };

  // 创建上传属性
  const createUploadProps = (fileType, accept, messageIndex) => ({
    beforeUpload: (file) => beforeUpload(file, fileType, messageIndex),
    onChange: (info) => handleFileUpload(info, fileType, messageIndex),
    showUploadList: false,
    multiple: true,
    accept
  });

  // 渲染单个消息编辑器
  const renderMessageEditor = (message, messageIndex) => {
    // 检查消息类型以决定哪些上传按钮应该禁用
    const hasTextImgVideo = hasTextImageVideo(message);
    const hasFile = hasFiles(message);
    
    return (
      <Space direction="vertical" style={{ width: '100%' }} size="middle">
        {/* 文本输入区域 */}
        <div>
          <Text strong>消息文本：</Text>
          <TextArea
            value={message.text}
            onChange={(e) => handleTextChange(e, messageIndex)}
            placeholder="请输入要发送的消息内容..."
            rows={4}
            disabled={disabled || hasFile}
            showCount
            maxLength={1000}
            style={{ marginTop: '8px' }}
          />
        </div>

        {/* 文件上传区域 */}
        <div>
          <Text strong>附件：</Text>
          <Space style={{ marginTop: '8px', marginBottom: '8px' }} wrap>
            <Upload {...createUploadProps('image', 'image/*', messageIndex)} disabled={disabled || hasFile}>
              <Button
                icon={<FileImageOutlined />}
                size="small"
                disabled={disabled || hasFile}
              >
                添加图片
              </Button>
            </Upload>

            <Upload {...createUploadProps('video', 'video/*', messageIndex)} disabled={disabled || hasFile}>
              <Button
                icon={<VideoCameraOutlined />}
                size="small"
                disabled={disabled || hasFile}
              >
                添加视频
              </Button>
            </Upload>

            <Upload {...createUploadProps('file', '*', messageIndex)} disabled={disabled || hasTextImgVideo}>
              <Button
                icon={<FileOutlined />}
                size="small"
                disabled={disabled || hasTextImgVideo}
              >
                添加文件
              </Button>
            </Upload>
          </Space>

          <Space wrap>
            {message.images && message.images.length > 0 && (
              <Tag color="blue">
                <FileImageOutlined /> {message.images.length} 张图片
              </Tag>
            )}
            {message.videos && message.videos.length > 0 && (
              <Tag color="purple">
                <VideoCameraOutlined /> {message.videos.length} 个视频
              </Tag>
            )}
            {message.files && message.files.length > 0 && (
              <Tag color="green">
                <FileOutlined /> {message.files.length} 个文件
              </Tag>
            )}
          </Space>

          {/* 文件预览列表 */}
          {((message.images && message.images.length > 0) ||
            (message.videos && message.videos.length > 0) ||
            (message.files && message.files.length > 0)) && (
            <div style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '8px',
              padding: '8px',
              border: '1px dashed #d9d9d9',
              borderRadius: '6px',
              backgroundColor: '#fafafa',
              marginTop: '8px'
            }}>
              {/* 图片预览 */}
              {message.images && message.images.map((image, index) => (
                <div
                  key={`image-${messageIndex}-${index}`}
                  style={{
                    position: 'relative',
                    border: '1px solid #d9d9d9',
                    borderRadius: '4px',
                    overflow: 'auto'
                  }}
                >
                  <Image
                    src={image.data || image}
                    alt={image.name || `图片 ${index + 1}`}
                    width={80}
                    height={80}
                    style={{ objectFit: 'cover', cursor: 'pointer' }}
                    preview={{
                      visible: false
                    }}
                    onClick={() => handlePreview(image.data || image)}
                  />
                  <Button
                    type="text"
                    danger
                    size="small"
                    icon={<DeleteOutlined />}
                    style={{
                      position: 'absolute',
                      top: '2px',
                      right: '2px',
                      backgroundColor: 'rgba(255, 255, 255, 0.8)'
                    }}
                    onClick={() => handleFileRemove(index, 'image', messageIndex)}
                    disabled={disabled}
                  />
                </div>
              ))}

              {/* 视频预览 */}
              {message.videos && message.videos.map((video, index) => (
                <div
                  key={`video-${messageIndex}-${index}`}
                  style={{
                    position: 'relative',
                    border: '1px solid #d9d9d9',
                    borderRadius: '4px',
                    overflow: 'auto',
                    width: '80px',
                    height: '80px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: '#f0f0f0'
                  }}
                >
                  <div style={{ textAlign: 'center' }}>
                    <PlayCircleOutlined style={{ fontSize: '24px', color: '#1890ff' }} />
                    <div style={{ fontSize: '10px', marginTop: '4px' }}>
                      {video.name || `视频${index + 1}`}
                    </div>
                  </div>
                  <Button
                    type="text"
                    danger
                    size="small"
                    icon={<DeleteOutlined />}
                    style={{
                      position: 'absolute',
                      top: '2px',
                      right: '2px',
                      backgroundColor: 'rgba(255, 255, 255, 0.8)'
                    }}
                    onClick={() => handleFileRemove(index, 'video', messageIndex)}
                    disabled={disabled}
                  />
                </div>
              ))}

              {/* 文件预览 */}
              {message.files && message.files.map((file, index) => (
                <div
                  key={`file-${messageIndex}-${index}`}
                  style={{
                    position: 'relative',
                    border: '1px solid #d9d9d9',
                    borderRadius: '4px',
                    overflow: 'auto',
                    width: '80px',
                    height: '80px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: '#f0f0f0'
                  }}
                >
                  <div style={{ textAlign: 'center' }}>
                    <FileOutlined style={{ fontSize: '24px', color: '#52c41a' }} />
                    <div style={{ fontSize: '10px', marginTop: '4px' }}>
                      {file.name || `文件${index + 1}`}
                    </div>
                  </div>
                  <Button
                    type="text"
                    danger
                    size="small"
                    icon={<DeleteOutlined />}
                    style={{
                      position: 'absolute',
                      top: '2px',
                      right: '2px',
                      backgroundColor: 'rgba(255, 255, 255, 0.8)'
                    }}
                    onClick={() => handleFileRemove(index, 'file', messageIndex)}
                    disabled={disabled}
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 消息预览 */}
        {(message.text ||
          (message.images && message.images.length > 0) ||
          (message.videos && message.videos.length > 0) ||
          (message.files && message.files.length > 0)) && (
          <div>
            <Text strong>消息预览：</Text>
            <div style={{
              marginTop: '8px',
              padding: '12px',
              border: '1px solid #e8e8e8',
              borderRadius: '6px',
              backgroundColor: '#f9f9f9'
            }}>
              {/* 文字内容 */}
              {message.text && (
                <div style={{ marginBottom: message.images?.length > 0 ? '12px' : '8px' }}>
                  <Text style={{ whiteSpace: 'pre-wrap' }}>{message.text}</Text>
                </div>
              )}

              {/* 图片预览 */}
              {message.images && message.images.length > 0 && (
                <div style={{ marginBottom: '8px' }}>
                  <div style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '4px',
                    marginBottom: '4px'
                  }}>
                    {message.images.slice(0, 6).map((image, index) => (
                      <Image
                        key={`preview-image-${messageIndex}-${index}`}
                        src={image.data || image}
                        alt={image.name || `图片 ${index + 1}`}
                        width={60}
                        height={60}
                        style={{
                          objectFit: 'cover',
                          borderRadius: '4px',
                          border: '1px solid #d9d9d9'
                        }}
                        preview={{
                          visible: false
                        }}
                        onClick={() => handlePreview(image.data || image)}
                      />
                    ))}
                    {message.images.length > 6 && (
                      <div style={{
                        width: '60px',
                        height: '60px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: '#f0f0f0',
                        border: '1px solid #d9d9d9',
                        borderRadius: '4px',
                        fontSize: '12px',
                        color: '#666'
                      }}>
                        +{message.images.length - 6}
                      </div>
                    )}
                  </div>
                  <Text type="secondary" style={{ fontSize: '12px' }}>
                    <FileImageOutlined /> {message.images.length} 张图片
                  </Text>
                </div>
              )}

              {/* 其他附件信息 */}
              <Space wrap>
                {message.videos && message.videos.length > 0 && (
                  <Text type="secondary" style={{ fontSize: '12px' }}>
                    <VideoCameraOutlined /> {message.videos.length} 个视频
                  </Text>
                )}
                {message.files && message.files.length > 0 && (
                  <Text type="secondary" style={{ fontSize: '12px' }}>
                    <FileOutlined /> {message.files.length} 个文件
                  </Text>
                )}
              </Space>
            </div>
          </div>
        )}
      </Space>
    );
  };

  return (
    <Card
      title={
        <Space>
          <Title level={4} style={{ margin: 0 }}>编辑消息内容</Title>
          <Text type="secondary">支持多条消息和文件</Text>
        </Space>
      }
      size="small"
      style={{ marginBottom: '16px' }}
    >
      <Space direction="vertical" style={{ width: '100%' }} size="middle">
        {/* 消息间隔设置 */}
        <div>
          <Space align="center">
            <Text strong><ClockCircleOutlined /> 消息间隔：</Text>
            <InputNumber
              min={1}
              max={60}
              value={messageInterval}
              onChange={handleIntervalChange}
              disabled={disabled}
              addonAfter="秒"
              style={{ width: '120px' }}
            />
            <Text type="secondary">每条消息发送完成后等待的时间</Text>
          </Space>
        </div>

        <Divider style={{ margin: '12px 0' }} />

        {/* 消息列表 */}
        <div>
          <Space style={{ marginBottom: '12px' }}>
            <Text strong><OrderedListOutlined /> 消息列表 ({messages.length} 条)：</Text>
            <Button
              type="dashed"
              size="small"
              icon={<PlusOutlined />}
              onClick={addMessage}
              disabled={disabled}
            >
              添加消息
            </Button>
          </Space>

          <Tabs
            activeKey={activeTab}
            onChange={setActiveTab}
            type="editable-card"
            onEdit={(targetKey, action) => {
              if (action === 'remove') {
                removeMessage(parseInt(targetKey));
              } else if (action === 'add') {
                addMessage();
              }
            }}
            tabBarExtraContent={{
              right: messages.length > 1 && (
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  发送顺序：从左到右
                </Text>
              )
            }}
          >
            {messages.map((message, index) => (
              <TabPane
                tab={`消息 ${index + 1}`}
                key={String(index)}
                closable={messages.length > 1}
              >
                <div style={{ marginBottom: '12px' }}>
                  <Space>
                    <Button
                      size="small"
                      icon={<CopyOutlined />}
                      onClick={() => copyMessage(index)}
                      disabled={disabled}
                    >
                      复制此消息
                    </Button>
                    {messages.length > 1 && (
                      <Popconfirm
                        title="确定删除这条消息吗？"
                        onConfirm={() => removeMessage(index)}
                        disabled={disabled}
                      >
                        <Button
                          size="small"
                          danger
                          icon={<DeleteOutlined />}
                          disabled={disabled}
                        >
                          删除
                        </Button>
                      </Popconfirm>
                    )}
                  </Space>
                </div>
                {renderMessageEditor(message, index)}
              </TabPane>
            ))}
          </Tabs>
        </div>
      </Space>

      {/* 图片预览模态框 */}
      <Image
        style={{ display: 'none' }}
        src={previewImage}
        preview={{
          visible: previewVisible,
          onVisibleChange: setPreviewVisible,
        }}
      />
    </Card>
  );
};

export default MessageEditor;