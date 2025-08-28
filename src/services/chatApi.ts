// import { http } from "./http"; // 暂时不使用

/**
 * 模型常量
 */
export const ModelConst = {
    QW_PLUS: 'qwPlus',
    QW_TURBO: 'qwTurbo',
} as const;

/**
 * 聊天会话信息
 */
export interface ChatConversation {
    id: number;
    seq: string;
    userId: number;
    title: string;
    createTime: string;
    updateTime: string;
}

/**
 * 聊天请求参数
 */
export interface ChatRequest {
    conversationSeq: string;
    model: string;
    userText: string;
}

/**
 * SSE 事件类型
 */
export const SseEventType = {
    CONVERSATION_INFO: 'CONVERSATION_INFO',
    TEXT: 'TEXT',
    ERROR: 'ERROR'
} as const;

export type SseEventTypeValues = typeof SseEventType[keyof typeof SseEventType];

/**
 * SSE 事件数据
 */
export interface SseEventData {
    event: SseEventTypeValues;
    data: string;
}

/**
 * SSE 回调函数类型
 */
export interface SseCallbacks {
    onConversationInfo?: (data: ChatConversation) => void;
    onText?: (text: string) => void;
    onError?: (error: string) => void;
    onComplete?: () => void;
}

/**
 * 发送聊天消息并接收 SSE 响应
 * @param request 聊天请求参数
 * @param callbacks SSE 事件回调函数
 * @returns Promise<void>
 */
export function sendChatMessage(
    request: ChatRequest,
    callbacks: SseCallbacks
): Promise<void> {
    return new Promise((resolve, reject) => {
        // 使用 fetch 来处理 POST 请求的 SSE（EventSource 只支持 GET 请求）
        fetch(`${import.meta.env.VITE_BASE_URL}/chat/string`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(request),
        })
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            if (!response.body) {
                throw new Error('Response body is null');
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';

            const readStream = async (): Promise<void> => {
                try {
                    const { done, value } = await reader.read();
                    
                    if (done) {
                        callbacks.onComplete?.();
                        resolve();
                        return;
                    }

                    buffer += decoder.decode(value, { stream: true });
                    const lines = buffer.split('\n');
                    buffer = lines.pop() || ''; // 保留最后一行（可能不完整）

                    let currentEvent = '';
                    let currentData = '';

                    for (const line of lines) {
                        if (line.startsWith('event:')) {
                            currentEvent = line.substring(6).trim();
                        } else if (line.startsWith('data:')) {
                            currentData = line.substring(5);
                        } else if (line === '') {
                            // 空行表示事件结束
                            if (currentEvent && currentData !== undefined) {
                                handleSseEvent(currentEvent, currentData, callbacks);
                            }
                            currentEvent = '';
                            currentData = '';
                        }
                    }

                    // 继续读取
                    await readStream();
                } catch (error) {
                    callbacks.onError?.(error instanceof Error ? error.message : '读取流时发生错误');
                    reject(error);
                }
            };

            return readStream();
        })
        .catch(error => {
            callbacks.onError?.(error instanceof Error ? error.message : '请求失败');
            reject(error);
        });
    });
}

/**
 * 处理 SSE 事件
 * @param event 事件类型
 * @param data 事件数据
 * @param callbacks 回调函数
 */
function handleSseEvent(event: string, data: string, callbacks: SseCallbacks): void {
    try {
        switch (event) {
            case SseEventType.CONVERSATION_INFO:
                if (callbacks.onConversationInfo) {
                    const conversationInfo: ChatConversation = JSON.parse(data);
                    callbacks.onConversationInfo(conversationInfo);
                }
                break;
            
            case SseEventType.TEXT:
                if (callbacks.onText && data) {
                    callbacks.onText(data);
                }
                break;
            
            case SseEventType.ERROR:
                if (callbacks.onError) {
                    callbacks.onError(data);
                }
                break;
            
            default:
                console.warn('未知的 SSE 事件类型:', event);
                break;
        }
    } catch (error) {
        console.error('处理 SSE 事件时出错:', error);
        callbacks.onError?.(error instanceof Error ? error.message : '处理事件时发生错误');
    }
}

