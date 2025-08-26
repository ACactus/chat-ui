import Chat, { Bubble, useMessages } from '@chatui/core';
import Avatar from './assets/avatar.jpg'

const initialMessages = [
  {
    type: 'system',
    content: { text: '我是贾维斯Mk1，正在迭代' },
  },
  {
    type: 'text',
    content: { text: '你好，有什么能帮你的？' },
    user: {
      avatar: Avatar,
    },
  },
];


export default function() {
  // 消息列表
  const { messages, appendMsg } = useMessages(initialMessages);

  // 发送回调
  function handleSend(type: string, val: string) {
    if (type === 'text' && val.trim()) {
      appendMsg({
        type: 'text',
        content: { text: val },
        position: 'right',
      });

      
    }
  }

  // 快捷短语回调，可根据 item 数据做出不同的操作，这里以发送文本消息为例
  function handleQuickReplyClick(item) {
    handleSend('text', item.name);
  }

  function renderMessageContent(msg) {
    const { type, content } = msg;

    // 根据消息类型来渲染
    switch (type) {
      case 'text':
        return <Bubble content={content.text} />;
      case 'image':
        return (
          <Bubble type="image">
            <img src={content.picUrl} alt="" />
          </Bubble>
        );
      default:
        return null;
    }
  }

  return (
    <Chat
      navbar={{ title: '贾维斯MK1' }}
      messages={messages}
      renderMessageContent={renderMessageContent}
      onQuickReplyClick={handleQuickReplyClick}
      onSend={handleSend}
    />
  );
}