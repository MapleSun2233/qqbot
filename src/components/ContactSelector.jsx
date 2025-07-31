import { useState } from 'react';
import {
  Card,
  Tree,
  Button,
  Space,
  Typography,
  Badge,
  Input,
  Empty
} from 'antd';
import {
  TeamOutlined,
  UserOutlined,
  SelectOutlined,
  ClearOutlined
} from '@ant-design/icons';

const { Title, Text } = Typography;
const { Search } = Input;

const ContactSelector = ({ groups, friends, selectedContacts, onSelectionChange }) => {
  const [searchText, setSearchText] = useState('');
  const [expandedKeys, setExpandedKeys] = useState([]);
  const [checkedKeys, setCheckedKeys] = useState([]);

  // 构建群组树数据
  const buildGroupTreeData = () => {
    if (!groups || groups.length === 0) {
      return [];
    }

    return groups
      .filter(group => 
        !searchText || 
        group.group_name?.toLowerCase().includes(searchText.toLowerCase()) ||
        group.group_id?.toString().includes(searchText)
      )
      .map(group => ({
        title: (
          <Space>
            <TeamOutlined />
            <Text>{group.group_name || `群${group.group_id}`}</Text>
            <Badge count={group.member_count} showZero style={{ backgroundColor: '#52c41a' }} />
          </Space>
        ),
        key: `group_${group.group_id}`,
        contactType: 'group',
        contactId: group.group_id,
        contactName: group.group_name || `群${group.group_id}`,
        isLeaf: true
      }));
  };

  // 构建好友树数据
  const buildFriendTreeData = () => {
    if (!friends || friends.length === 0) {
      return [];
    }

    return friends.map(category => {
      const categoryKey = `category_${category.categoryId}`;
      const filteredBuddies = (category.buddyList || [])
        .filter(buddy => 
          !searchText || 
          buddy.nick?.toLowerCase().includes(searchText.toLowerCase()) ||
          buddy.remark?.toLowerCase().includes(searchText.toLowerCase()) ||
          buddy.uin?.toString().includes(searchText)
        );

      return {
        title: (
          <Space>
            <UserOutlined />
            <Text>{category.categroyName || '默认分组'}</Text>
            <Badge count={filteredBuddies.length} showZero style={{ backgroundColor: '#1890ff' }} />
          </Space>
        ),
        key: categoryKey,
        children: filteredBuddies.map(buddy => ({
          title: (
            <Space>
              <Text>{buddy.remark || buddy.nick || buddy.uin}</Text>
              <Text type="secondary" style={{ fontSize: '12px' }}>({buddy.uin})</Text>
            </Space>
          ),
          key: `friend_${buddy.uin}`,
          contactType: 'friend',
          contactId: buddy.uin,
          contactName: buddy.remark || buddy.nick || buddy.uin,
          isLeaf: true
        }))
      };
    }).filter(category => category.children.length > 0);
  };

  // 处理选择变化
  const handleCheck = (checkedKeysValue) => {
    setCheckedKeys(checkedKeysValue);
    
    // 提取所有叶子节点（实际的联系人）
    const contacts = [];
    const processNode = (node) => {
      if (node.isLeaf && checkedKeysValue.includes(node.key)) {
        contacts.push({
          type: node.contactType,
          id: node.contactId,
          name: node.contactName
        });
      }
      if (node.children) {
        node.children.forEach(processNode);
      }
    };

    [...buildGroupTreeData(), ...buildFriendTreeData()].forEach(processNode);
    onSelectionChange(contacts);
  };

  // 全选/取消全选
  const handleSelectAll = () => {
    const allTreeData = [...buildGroupTreeData(), ...buildFriendTreeData()];
    const allLeafKeys = [];
    
    const collectLeafKeys = (nodes) => {
      nodes.forEach(node => {
        if (node.isLeaf) {
          allLeafKeys.push(node.key);
        }
        if (node.children) {
          collectLeafKeys(node.children);
        }
      });
    };
    
    collectLeafKeys(allTreeData);
    
    if (checkedKeys.length === allLeafKeys.length) {
      // 当前全选，执行取消全选
      setCheckedKeys([]);
      onSelectionChange([]);
    } else {
      // 执行全选
      setCheckedKeys(allLeafKeys);
      handleCheck(allLeafKeys, null);
    }
  };

  const groupTreeData = buildGroupTreeData();
  const friendTreeData = buildFriendTreeData();
  const totalContacts = selectedContacts.length;

  // 统计选中的群组和好友数量
  const selectedGroups = selectedContacts.filter(c => c.type === 'group').length;
  const selectedFriends = selectedContacts.filter(c => c.type === 'friend').length;

  // 合并群组和好友数据到一个树结构
  const buildUnifiedTreeData = () => {
    const unifiedData = [];

    // 添加群组根节点
    if (groupTreeData.length > 0) {
      unifiedData.push({
        title: (
          <Space>
            <TeamOutlined />
            <Text strong>群组 ({groupTreeData.length})</Text>
          </Space>
        ),
        key: 'groups-root',
        children: groupTreeData
      });
    }

    // 添加好友根节点
    if (friendTreeData.length > 0) {
      unifiedData.push({
        title: (
          <Space>
            <UserOutlined />
            <Text strong>好友 ({friendTreeData.reduce((sum, cat) => sum + cat.children.length, 0)})</Text>
          </Space>
        ),
        key: 'friends-root',
        children: friendTreeData
      });
    }

    return unifiedData;
  };

  const unifiedTreeData = buildUnifiedTreeData();

  return (
    <Card
      title={
        <Space>
          <Title level={4} style={{ margin: 0 }}>选择发送对象</Title>
          <Badge count={totalContacts} showZero />
        </Space>
      }
      size="small"
      style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
      styles={{
        body: {
          padding: '12px',
          flex: 1,
          overflow: 'auto',
          display: 'flex',
          flexDirection: 'column'
        }
      }}
    >
      <Space direction="vertical" style={{ width: '100%', height: '100%' }} size="middle">
        <Search
          placeholder="搜索群组或好友"
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          style={{ width: '100%' }}
          allowClear
        />
        
        <Space>
          <Button 
            type="primary" 
            size="small" 
            icon={<SelectOutlined />}
            onClick={handleSelectAll}
          >
            {checkedKeys.length > 0 ? '取消全选' : '全选'}
          </Button>
          <Button 
            size="small" 
            icon={<ClearOutlined />}
            onClick={() => {
              setCheckedKeys([]);
              onSelectionChange([]);
            }}
          >
            清空
          </Button>
        </Space>

        <div style={{ marginBottom: '8px' }}>
          <Text type="secondary" style={{ fontSize: '12px' }}>
            💡 提示：可以同时选择群组和好友进行批量发送
          </Text>
          {totalContacts > 0 && (
            <div style={{ marginTop: '4px' }}>
              <Text style={{ fontSize: '12px' }}>
                已选择:
                {selectedGroups > 0 && <span style={{ color: '#1890ff' }}> {selectedGroups}个群组</span>}
                {selectedGroups > 0 && selectedFriends > 0 && <span> + </span>}
                {selectedFriends > 0 && <span style={{ color: '#52c41a' }}> {selectedFriends}个好友</span>}
              </Text>
            </div>
          )}
        </div>

        <div style={{ flex: 1, overflow: 'auto' }}>
          {unifiedTreeData.length > 0 ? (
            <Tree
              checkable
              checkedKeys={checkedKeys}
              onCheck={handleCheck}
              onExpand={setExpandedKeys}
              expandedKeys={expandedKeys}
              treeData={unifiedTreeData}
              height="100%"
              defaultExpandedKeys={['groups-root', 'friends-root']}
              showLine={true}
              style={{ height: '100%' }}
            />
          ) : (
            <Empty description="暂无联系人数据" />
          )}
        </div>
      </Space>
    </Card>
  );
};

export default ContactSelector;
