import { useState, useEffect } from 'react'
import { Layout, message } from 'antd'
import ConnectionStatus from './components/ConnectionStatus'
import ContactSelector from './components/ContactSelector'
import MessageEditor from './components/MessageEditor'
import SendProgress from './components/SendProgress'
import LLOneBotAPI from './api/llonebot'
import './App.css'

const { Header, Content, Sider } = Layout;

function App() {
  const [api] = useState(() => new LLOneBotAPI());
  const [connected, setConnected] = useState(false);
  const [groups, setGroups] = useState([]);
  const [friends, setFriends] = useState([]);
  const [selectedContacts, setSelectedContacts] = useState([]);
  const [messageContent, setMessageContent] = useState({
    messages: [{
      text: '',
      images: [],
      videos: [],
      files: []
    }],
    messageInterval: 3
  });
  const [sending, setSending] = useState(false);
  const [sendProgress, setSendProgress] = useState({ current: 0, total: 0, failed: [] });

  useEffect(() => {
    // 设置连接状态变化回调
    api.setConnectionChangeCallback((isConnected) => {
      console.log('连接状态变化:', isConnected);
      setConnected(isConnected);
      if (isConnected) {
        message.success('WebSocket连接成功');
        loadContacts();
      } else {
        message.error('WebSocket连接断开');
      }
    });

    // 尝试连接
    connectToServer();

    return () => {
      api.disconnect();
    };
  }, []);

  const connectToServer = async () => {
    try {
      await api.connect();
    } catch (error) {
      console.error('连接失败:', error);
      message.error('连接失败，正在尝试重连...');
    }
  };

  const loadContacts = async () => {
    try {
      // 加载群列表
      const groupList = await api.getGroupList();
      setGroups(groupList || []);

      // 加载好友列表
      const friendList = await api.getFriendsWithCategory();
      setFriends(friendList || []);
    } catch (error) {
      console.error('加载联系人失败:', error);
      message.error('加载联系人失败');
    }
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header style={{ background: '#fff', padding: '0 24px', borderBottom: '1px solid #f0f0f0' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 'bold' }}>QQ机器人批量发送工具</h1>
          <ConnectionStatus connected={connected} onReconnect={connectToServer} />
        </div>
      </Header>

      <Layout style={{ height: 'calc(100vh - 64px)' }}>
        <Sider
          width={350}
          style={{
            background: '#fff',
            borderRight: '1px solid #f0f0f0',
            height: '100%',
            overflow: 'auto'
          }}
        >
          <ContactSelector
            groups={groups}
            friends={friends}
            selectedContacts={selectedContacts}
            onSelectionChange={setSelectedContacts}
          />
        </Sider>

        <Content
          style={{
            padding: '24px',
            background: '#fff',
            height: '100%',
            overflow: 'auto'
          }}
        >
          <MessageEditor
            value={messageContent}
            onChange={setMessageContent}
            disabled={!connected || sending}
          />

          <SendProgress
            api={api}
            connected={connected}
            selectedContacts={selectedContacts}
            messageContent={messageContent}
            sending={sending}
            setSending={setSending}
            progress={sendProgress}
            setProgress={setSendProgress}
          />
        </Content>
      </Layout>
    </Layout>
  )
}

export default App
