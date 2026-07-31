import { describe, it, expect, vi } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useRealtimeRefetch } from './useRealtimeRefetch'

function createFakeClient() {
  const channel = {
    on: vi.fn().mockReturnThis(),
    subscribe: vi.fn().mockReturnThis(),
  }
  return {
    channel: vi.fn().mockReturnValue(channel),
    removeChannel: vi.fn(),
    _channel: channel,
  }
}

describe('useRealtimeRefetch', () => {
  it('subscribes to postgres_changes for the given table and unsubscribes on cleanup', () => {
    const client = createFakeClient()
    const onChange = vi.fn()

    const { unmount } = renderHook(() => useRealtimeRefetch(client as any, 'tanks', onChange))

    expect(client.channel).toHaveBeenCalledWith('realtime:tanks')
    expect(client._channel.on).toHaveBeenCalledWith(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'tanks' },
      onChange
    )
    expect(client._channel.subscribe).toHaveBeenCalled()

    unmount()
    expect(client.removeChannel).toHaveBeenCalled()
  })
})
