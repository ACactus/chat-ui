import Chat, { Bubble, useMessages } from '@chatui/core';
import Avatar from './assets/avatar.jpg';
import { sendChatMessage, ModelConst, type ChatRequest } from './services/chatApi';
import { useState } from 'react';

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
  const { messages, appendMsg, updateMsg } = useMessages(initialMessages);
  
  // 状态管理
  const [isLoading, setIsLoading] = useState(false);
  const [conversationSeq, setConversationSeq] = useState<string>('');
  const [currentAiResponse, setCurrentAiResponse] = useState<string>('');

  // 发送回调
  function handleSend(type: string, val: string) {
    if (type === 'text' && val.trim()) {
      // 添加用户消息
      appendMsg({
        type: 'text',
        content: { text: val },
        position: 'right',
      });

      // 添加 AI 回复消息占位符
      const aiMsgId = Date.now().toString();
      appendMsg({
        type: 'text',
        content: { text: '' },
        user: {
          avatar: Avatar,
        },
        _id: aiMsgId,
      });

      setIsLoading(true);
      setCurrentAiResponse(''); // 重置当前 AI 回复

      // 构建请求参数
      const request: ChatRequest = {
        conversationSeq: conversationSeq,
        model: ModelConst.QW_TURBO,
        userText: val,
      };

      // 发送 SSE 请求
      sendChatMessage(request, {
        onConversationInfo: (conversation) => {
          console.log('会话信息:', conversation);
          setConversationSeq(conversation.seq);
        },
        onText: (text) => {
          // 累积 AI 回复文本
          setCurrentAiResponse(prev => {
            const newText = prev + text;
            // 更新 AI 回复消息
            updateMsg(aiMsgId, {
              type: 'text',
              content: { text: newText },
              user: {
                avatar: Avatar,
              },
            });
            return newText;
          });
        },
        onError: (error) => {
          console.error('聊天错误:', error);
          updateMsg(aiMsgId, {
            type: 'text',
            content: { text: `抱歉，发生了错误：${error}` },
            user: {
              avatar: Avatar,
            },
          });
          setIsLoading(false);
          setCurrentAiResponse('');
        },
        onComplete: () => {
          console.log('聊天完成');
          setIsLoading(false);
          setCurrentAiResponse('');
        },
      }).catch(error => {
        console.error('发送消息失败:', error);
        updateMsg(aiMsgId, {
          type: 'text',
          content: { text: `抱歉，网络请求失败：${error}` },
          user: {
            avatar: Avatar,
          },
        });
        setIsLoading(false);
        setCurrentAiResponse('');
      });
    }
  }

  // 生成会话序列号
  function generateConversationSeq(): string {
    return Date.now().toString() + Math.random().toString(36).substr(2, 9);
  }

  // 快捷短语回调，可根据 item 数据做出不同的操作，这里以发送文本消息为例
  function handleQuickReplyClick(item: any) {
    handleSend('text', item.name);
  }

  function renderMessageContent(msg: any) {
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
      placeholder={isLoading ? '正在思考中...' : '请输入消息...'}
    />
  );
}