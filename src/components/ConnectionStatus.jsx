import { Badge, Button, Space } from 'antd';
import { ReloadOutlined, WifiOutlined } from '@ant-design/icons';

const ConnectionStatus = ({ connected, onReconnect }) => {
  return (
    <Space>
      <Badge 
        status={connected ? 'success' : 'error'} 
        text={connected ? '已连接' : '未连接'}
      />
      <WifiOutlined style={{ color: connected ? '#52c41a' : '#ff4d4f' }} />
      {!connected && (
        <Button 
          type="primary" 
          size="small" 
          icon={<ReloadOutlined />}
          onClick={onReconnect}
        >
          重连
        </Button>
      )}
    </Space>
  );
};

export default ConnectionStatus;
