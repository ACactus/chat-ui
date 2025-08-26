import { http } from "./http";

/**
 * 聊天响应流式分片
 */
export interface ChatStreamResponseVO<T> {
    /** 指令类型，对应后端枚举的数值 */
    type: number;
    /** 内容，可能为 null（如结束包） */
    data: T | null;
    /** 是否完成（true 表示流结束） */
    completed: boolean;
}

/**
 * 聊天会话信息
 */
export interface ChatConversation {
    seq: string,
    title: string,
    createTime: string,
    updateTime: string
}

export interface ChatRequest {
    model: string,
    conversation?: string,
    userText: string
}

export function chat(param: ChatRequest){
    http.post("/chat/string", param)
        .then(response => {
            
        })
        .catch(e => {
            alert(`请求异常：${e}`);
        })
}

/**
 * 基于 fetch 的流式聊天（逐行 JSON）
 * - 后端按行返回 JSON，每行一个 ChatStreamResponseVO 片段
 * - 回调参数全部为可选，按需传入
 */
export async function chatStream(
  param: ChatRequest,
  opts?: {
    onConversationUpdate?: (conv: ChatConversation) => void;
    onContentUpdate?: (content: string) => void; // 累计内容
    onComplete?: () => void;
    onError?: (error: unknown) => void;
  }
): Promise<void> {
  const baseURL = http.defaults?.baseURL || "";
  let accumulated = "";

  try {
    const res = await fetch(`${baseURL}/chat/string`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(param)
    });

    if (!res.ok || !res.body) {
      throw new Error(`网络错误或无响应体：${res.status}`);
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      let index;
      while ((index = buffer.indexOf('\n')) >= 0) {
        const line = buffer.slice(0, index).trim();
        buffer = buffer.slice(index + 1);
        if (!line) continue;
        try {
          const item = JSON.parse(line) as ChatStreamResponseVO<string | ChatConversation>;
          // 会话信息
          if (item.type === 1 && item.data) {
            opts?.onConversationUpdate?.(item.data as ChatConversation);
          }
          // 内容追加
          if (item.type === 2) {
            const piece = (item.data ?? '') as string;
            accumulated += piece;
            opts?.onContentUpdate?.(accumulated);
          }
          // 完成
          if (item.completed) {
            opts?.onComplete?.();
            return;
          }
        } catch (_) {
          // 单行解析失败，忽略该行，继续读取
        }
      }
    }

    // 读完但未显式 completed，也认为完成
    opts?.onComplete?.();
  } catch (err) {
    opts?.onError?.(err);
    throw err;
  }
}

