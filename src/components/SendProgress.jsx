import { useState, useRef } from 'react';
import {
  Card,
  Button,
  Progress,
  Space,
  Typography,
  List,
  Tag,
  Modal,
  message as antMessage,
  Statistic,
  Row,
  Col,
  Alert,
  InputNumber,
  Divider
} from 'antd';
import {
  SendOutlined,
  StopOutlined,
  ReloadOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined
} from '@ant-design/icons';

const { Title, Text } = Typography;

const SendProgress = ({
  api,
  connected,
  selectedContacts,
  messageContent,
  sending,
  setSending,
  progress,
  setProgress
}) => {
  const [sendResults, setSendResults] = useState([]);
  const [showFailedModal, setShowFailedModal] = useState(false);
  const [currentDelay, setCurrentDelay] = useState(0);
  const [delayMin, setDelayMin] = useState(1); // 最小延时（秒）
  const [delayMax, setDelayMax] = useState(3); // 最大延时（秒）
  const sendingRef = useRef(false);

  // 生成随机延迟时间（用户可配置）
  const getRandomDelay = () => {
    const minMs = Math.min(delayMin, delayMax) * 1000;
    const maxMs = Math.max(delayMin, delayMax) * 1000;
    return Math.floor(Math.random() * (maxMs - minMs)) + minMs;
  };

  // 处理延时设置变化
  const handleDelayMinChange = (value) => {
    if (value && value > delayMax) {
      setDelayMax(value);
    }
    setDelayMin(value);
  };

  const handleDelayMaxChange = (value) => {
    if (value && value < delayMin) {
      setDelayMin(value);
    }
    setDelayMax(value);
  };

  // 检查消息内容是否有效
  const hasValidContent = (message) => {
    return message.text ||
           (message.images && message.images.length > 0) ||
           (message.videos && message.videos.length > 0) ||
           (message.files && message.files.length > 0);
  };

  // 检查处理后的消息内容是否有效（用于判断是否应该发送消息）
  const hasValidContentAfterProcessing = (message) => {
    return message.text ||
           (message.images && message.images.length > 0) ||
           (message.videos && message.videos.length > 0);
  };

  // 开始发送
  const handleSend = async () => {
    console.log('handleSend 被调用');
    console.log('连接状态:', connected);
    console.log('选中联系人:', selectedContacts);
    console.log('消息内容:', messageContent);

    if (!selectedContacts || selectedContacts.length === 0) {
      antMessage.warning('请先选择发送对象');
      return;
    }

    // 支持新的多消息格式和旧的单消息格式
    let messages = [];
    let messageInterval = 3;

    if (messageContent.messages && Array.isArray(messageContent.messages)) {
      // 新格式：多条消息
      messages = messageContent.messages;
      messageInterval = messageContent.messageInterval || 3;
    } else {
      // 旧格式：单条消息，转换为数组
      messages = [messageContent];
    }

    // 检查是否有有效的消息内容
    const validMessages = messages.filter(hasValidContent);
    if (validMessages.length === 0) {
      console.log('❌ 内容检查失败');
      antMessage.warning('请输入消息内容或添加附件');
      return;
    }

    console.log(`✅ 准备发送 ${validMessages.length} 条消息给 ${selectedContacts.length} 个联系人`);
    console.log('消息间隔:', messageInterval, '秒');

    console.log('✅ 开始设置发送状态');
    setSending(true);
    sendingRef.current = true;
    setSendResults([]);
    // 总进度 = 联系人数量 × 消息数量
    const totalTasks = selectedContacts.length * validMessages.length;
    setProgress({ current: 0, total: totalTasks, failed: [] });

    console.log('✅ 开始发送循环');

    const results = [];
    const failed = [];
    let currentTask = 0;

    // 按消息顺序发送：先发第一条消息给所有人，再发第二条消息给所有人...
    for (let messageIndex = 0; messageIndex < validMessages.length; messageIndex++) {
      if (!sendingRef.current) {
        console.log('🛑 发送被停止');
        break;
      }

      const currentMessage = validMessages[messageIndex];
      console.log(`📝 开始发送第 ${messageIndex + 1}/${validMessages.length} 条消息`);

      // 发送当前消息给所有联系人
      for (let contactIndex = 0; contactIndex < selectedContacts.length; contactIndex++) {
        if (!sendingRef.current) {
          console.log('🛑 发送被停止');
          break;
        }

        const contact = selectedContacts[contactIndex];
        console.log(`📤 发送消息 ${messageIndex + 1} 给联系人 ${contactIndex + 1}/${selectedContacts.length}: ${contact.name} (${contact.type})`);

        try {
          // 处理文件上传
          let processedContent = { ...currentMessage };

          // 如果有文件需要上传，先上传文件
          if (currentMessage.files && currentMessage.files.length > 0) {
            // 发送文件
            console.log(`📝 准备发送消息给 ${contact.name}:`, {files: processedContent.files});
            for (const file of currentMessage.files) {
              try {
                if (contact.type === 'group') {
                  await api.uploadGroupFile(contact.id, file.data, file.name);
                } else {
                  await api.uploadPrivateFile(contact.id, file.data, file.name);
                }
              } catch (uploadError) {
                console.warn(`文件上传失败: ${file.name}`, uploadError);
                // 文件上传失败不影响消息发送，只是不包含该文件
              }
            }
            // 移除文件内容，因为文件已经单独上传
            processedContent = { ...processedContent, files: [] };
          }

          if (currentMessage.videos && currentMessage.videos.length > 0) {
            // 发送视频
            const videoMessage = {videos: processedContent.videos}
            console.log(`📝 准备发送消息给 ${contact.name}:`, videoMessage);
            if (contact.type === 'group') {
              await api.sendGroupVideoMessage(contact.id, videoMessage);
            } else {
              await api.sendPrivateVideoMessage(contact.id, videoMessage);
            }
            processedContent = { ...processedContent, videos: [] };
          }

          // 检查处理后的消息是否还有内容需要发送
          // 如果只有文件内容，上传文件后processedContent就变为空消息了，这时应该跳过发送
          if (!hasValidContentAfterProcessing(processedContent)) {
            console.log('消息处理后变为空消息，跳过发送');
            results.push({
              contact,
              message: currentMessage,
              messageIndex: messageIndex + 1,
              success: true,
              result: 'Skipped empty message',
              timestamp: new Date()
            });
            
            antMessage.success(`消息 ${messageIndex + 1} 处理完成: ${contact.name} (仅文件)`);
          } else {
            // 发送消息（包含文字、图片、视频）
            console.log(`📝 准备发送消息给 ${contact.name}:`, processedContent);
            let result;
            if (contact.type === 'group') {
              result = await api.sendGroupMessage(contact.id, processedContent);
            } else {
              result = await api.sendPrivateMessage(contact.id, processedContent);
            }
            console.log(`✅ 消息发送成功给 ${contact.name}:`, result);

            results.push({
              contact,
              message: currentMessage,
              messageIndex: messageIndex + 1,
              success: true,
              result,
              timestamp: new Date()
            });

            antMessage.success(`消息 ${messageIndex + 1} 发送成功: ${contact.name}`);
          }
        } catch (error) {
          console.error(`发送失败 ${contact.name}:`, error);

          const failedItem = {
            contact,
            message: currentMessage,
            messageIndex: messageIndex + 1,
            success: false,
            error: error.message,
            timestamp: new Date()
          };

          results.push(failedItem);
          failed.push(failedItem);

          antMessage.error(`消息 ${messageIndex + 1} 发送失败: ${contact.name} - ${error.message}`);
        }

        currentTask++;
        setProgress(prev => ({
          ...prev,
          current: currentTask,
          failed: failed
        }));
        setSendResults([...results]);

        // 添加随机延迟避免发送过快，防止封号
        if (contactIndex < selectedContacts.length - 1) {
          const randomDelay = getRandomDelay();
          setCurrentDelay(randomDelay);
          await new Promise(resolve => setTimeout(resolve, randomDelay));
        }
      }

      // 如果不是最后一条消息，等待指定的消息间隔时间
      if (messageIndex < validMessages.length - 1) {
        console.log(`⏰ 等待 ${messageInterval} 秒后发送下一条消息...`);
        setCurrentDelay(messageInterval * 1000);
        await new Promise(resolve => setTimeout(resolve, messageInterval * 1000));
      }
    }

    setSending(false);
    sendingRef.current = false;

    // 处理失败的消息
    if (failed.length > 0) {
      Modal.confirm({
        title: '发送完成',
        content: `成功发送 ${results.length - failed.length} 条，失败 ${failed.length} 条。是否重试失败的消息？`,
        onOk: () => retryFailed(failed),
        onCancel: () => setShowFailedModal(true)
      });
    } else {
      antMessage.success('所有消息发送成功！');
    }
  };

  // 重试失败的消息
  const retryFailed = async (failedItems) => {
    setSending(true);
    sendingRef.current = true;
    const retryResults = [];
    const stillFailed = [];

    setProgress(prev => ({
      ...prev,
      current: 0,
      total: failedItems.length
    }));

    for (let i = 0; i < failedItems.length; i++) {
      if (!sendingRef.current) break;

      const item = failedItems[i];
      const contact = item.contact;
      
      try {
        // 处理文件上传
        let processedContent = { ...item.message };

        // 如果有文件需要上传，先上传文件
        if (item.message.files && item.message.files.length > 0) {
          for (const file of item.message.files) {
            try {
              if (contact.type === 'group') {
                await api.uploadGroupFile(contact.id, file.data, file.name);
              } else {
                await api.uploadPrivateFile(contact.id, file.data, file.name);
              }
            } catch (uploadError) {
              console.warn(`文件上传失败: ${file.name}`, uploadError);
            }
          }
          processedContent = { ...processedContent, files: [] };
        }

        // 检查处理后的消息是否还有内容需要发送
        let result;
        if (!hasValidContentAfterProcessing(processedContent)) {
          console.log('消息处理后变为空消息，跳过发送');
          result = 'Skipped empty message';
        } else {
          if (contact.type === 'group') {
            result = await api.sendGroupMessage(contact.id, processedContent);
          } else {
            result = await api.sendPrivateMessage(contact.id, processedContent);
          }
        }

        retryResults.push({
          contact,
          message: item.message,
          messageIndex: item.messageIndex,
          success: true,
          result,
          timestamp: new Date(),
          isRetry: true
        });

        antMessage.success(`消息 ${item.messageIndex} 重试成功: ${contact.name}`);
      } catch (error) {
        const failedItem = {
          contact,
          message: item.message,
          messageIndex: item.messageIndex,
          success: false,
          error: error.message,
          timestamp: new Date(),
          isRetry: true
        };

        retryResults.push(failedItem);
        stillFailed.push(failedItem);

        antMessage.error(`消息 ${item.messageIndex} 重试失败: ${contact.name} - ${error.message}`);
      }

      setProgress(prev => ({ 
        ...prev, 
        current: i + 1,
        failed: stillFailed 
      }));

      if (i < failedItems.length - 1) {
        const randomDelay = getRandomDelay();
        setCurrentDelay(randomDelay);
        await new Promise(resolve => setTimeout(resolve, randomDelay));
      }
    }

    setSending(false);
    sendingRef.current = false;
    setSendResults(prev => [...prev, ...retryResults]);

    if (stillFailed.length > 0) {
      setShowFailedModal(true);
      antMessage.warning(`仍有 ${stillFailed.length} 条消息发送失败`);
    } else {
      antMessage.success('所有失败消息重试成功！');
    }
  };

  // 停止发送
  const handleStop = () => {
    console.log('🛑 用户停止发送');
    sendingRef.current = false;
    setSending(false);
    antMessage.info('已停止发送');
  };

  const successCount = sendResults.filter(r => r.success).length;
  const failedCount = sendResults.filter(r => !r.success).length;
  const progressPercent = progress.total > 0 ? (progress.current / progress.total) * 100 : 0;

  return (
    <Card
      title={<Title level={4} style={{ margin: 0 }}>发送控制</Title>}
      size="small"
      style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
      styles={{
        body: {
          padding: '16px',
          flex: 1,
          overflow: 'auto'
        }
      }}
    >
      <Space direction="vertical" style={{ width: '100%' }} size="middle">
        {/* 延时设置 */}
        <div style={{ marginBottom: '16px' }}>
          <Text strong>发送延时设置（防封号保护）：</Text>
          <div style={{ marginTop: '8px' }}>
            <Space align="center">
              <Text>延时区间：</Text>
              <InputNumber
                min={0.1}
                max={10}
                step={0.1}
                value={delayMin}
                onChange={handleDelayMinChange}
                disabled={sending}
                style={{ width: '80px' }}
                formatter={value => `${value}s`}
                parser={value => value.replace('s', '')}
              />
              <Text>~</Text>
              <InputNumber
                min={0.1}
                max={10}
                step={0.1}
                value={delayMax}
                onChange={handleDelayMaxChange}
                disabled={sending}
                style={{ width: '80px' }}
                formatter={value => `${value}s`}
                parser={value => value.replace('s', '')}
              />
              <Text type="secondary" style={{ fontSize: '12px' }}>
                (推荐1-3秒，避免发送过快被限制)
              </Text>
            </Space>
          </div>
        </div>

        <Divider style={{ margin: '16px 0' }} />

        {/* 发送按钮和控制 */}
        <Space>
          <Button
            type="primary"
            icon={<SendOutlined />}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              console.log('发送按钮被点击');
              handleSend();
            }}
            disabled={sending || !connected}
            loading={sending}
          >
            {sending ? '发送中...' : '开始发送'}
          </Button>
          
          <Button
            danger
            icon={<StopOutlined />}
            onClick={handleStop}
            disabled={!sending}
          >
            停止发送
          </Button>

          <Button
            icon={<ReloadOutlined />}
            onClick={() => retryFailed(progress.failed)}
            disabled={sending || progress.failed.length === 0}
          >
            重试失败 ({progress.failed.length})
          </Button>
        </Space>

        {/* 发送统计 - 始终显示 */}
        <Row gutter={16}>
          <Col span={6}>
            <Statistic
              title="总数"
              value={selectedContacts.length}
              prefix={<SendOutlined />}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="已发送"
              value={progress.current}
              valueStyle={{ color: '#1890ff' }}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="成功"
              value={successCount}
              valueStyle={{ color: '#52c41a' }}
              prefix={<CheckCircleOutlined />}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="失败"
              value={failedCount}
              valueStyle={{ color: '#ff4d4f' }}
              prefix={<CloseCircleOutlined />}
            />
          </Col>
        </Row>

        {/* 进度条 - 始终显示 */}
        <Progress
          percent={progressPercent}
          status={sending ? 'active' : (failedCount > 0 ? 'exception' : 'success')}
          format={() => `${progress.current}/${progress.total}`}
        />

        {/* 发送提示 */}
        {!connected && (
          <Alert
            message="WebSocket未连接"
            description="请先连接到WebSocket服务器"
            type="warning"
            showIcon
          />
        )}

        {selectedContacts.length === 0 && (
          <Alert
            message="未选择发送对象"
            description="请在左侧选择要发送消息的群组或好友"
            type="info"
            showIcon
          />
        )}

        {sending && currentDelay > 0 && (
          <Alert
            message={currentDelay >= 1000 ? "消息间隔等待" : "防封号保护"}
            description={
              currentDelay >= 1000
                ? `正在等待 ${(currentDelay / 1000).toFixed(1)} 秒后发送下一条消息`
                : `正在等待 ${(currentDelay / 1000).toFixed(1)} 秒后发送下一条消息（延时范围：${delayMin}-${delayMax}秒）`
            }
            type="info"
            showIcon
          />
        )}

        {!sending && (delayMin !== 1 || delayMax !== 3) && (
          <Alert
            message="延时设置"
            description={`当前延时范围：${delayMin}-${delayMax}秒`}
            type="info"
            showIcon
            style={{ marginTop: '8px' }}
          />
        )}
      </Space>

      {/* 失败列表模态框 */}
      <Modal
        title="发送失败列表"
        open={showFailedModal}
        onCancel={() => setShowFailedModal(false)}
        footer={[
          <Button key="close" onClick={() => setShowFailedModal(false)}>
            关闭
          </Button>,
          <Button 
            key="retry" 
            type="primary" 
            onClick={() => {
              setShowFailedModal(false);
              retryFailed(progress.failed);
            }}
          >
            重试失败项
          </Button>
        ]}
        width={600}
      >
        <List
          dataSource={progress.failed}
          renderItem={(item) => (
            <List.Item>
              <List.Item.Meta
                avatar={<CloseCircleOutlined style={{ color: '#ff4d4f' }} />}
                title={
                  <Space>
                    <Text>{item.contact.name}</Text>
                    <Tag color={item.contact.type === 'group' ? 'blue' : 'green'}>
                      {item.contact.type === 'group' ? '群组' : '好友'}
                    </Tag>
                    {item.messageIndex && (
                      <Tag color="orange">
                        消息 {item.messageIndex}
                      </Tag>
                    )}
                  </Space>
                }
                description={item.error}
              />
            </List.Item>
          )}
        />
      </Modal>
    </Card>
  );
};

export default SendProgress;