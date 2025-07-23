/**
 * Bilan Privacy Tests
 * 
 * Tests to ensure that sensitive information like userId is not logged
 * in debug mode or error messages, maintaining privacy compliance.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { initializeBilan } from '../bilan'

describe('Bilan Privacy and Security', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  describe('Debug Logging Privacy', () => {
    it('should not log sensitive userId in debug mode', async () => {
      // Mock console.log to capture debug output
      const mockConsoleLog = vi.spyOn(console, 'log').mockImplementation(() => {})
      
      // Enable debug mode
      vi.stubEnv('NEXT_PUBLIC_DEBUG', 'true')
      vi.stubEnv('NEXT_PUBLIC_BILAN_MODE', 'local')
      
      try {
        // Initialize Bilan with a test userId
        await initializeBilan('sensitive_user_123')
        
        // Verify that debug logs were made
        expect(mockConsoleLog).toHaveBeenCalled()
        
        // Verify that NO debug log contains the sensitive userId
        const debugCalls = mockConsoleLog.mock.calls
        for (const call of debugCalls) {
          const logMessage = JSON.stringify(call)
          expect(logMessage).not.toContain('sensitive_user_123')
          expect(logMessage).not.toContain('"userId"')
        }
        
        // Verify that safe information is still logged
        expect(mockConsoleLog).toHaveBeenCalledWith(
          'Bilan SDK initialized successfully',
          expect.objectContaining({
            mode: 'local'
          })
        )
        
      } finally {
        mockConsoleLog.mockRestore()
      }
    })

    it('should include only non-sensitive information in debug logs', async () => {
      const mockConsoleLog = vi.spyOn(console, 'log').mockImplementation(() => {})
      
      vi.stubEnv('NEXT_PUBLIC_DEBUG', 'true')
      vi.stubEnv('NEXT_PUBLIC_BILAN_MODE', 'server')
      vi.stubEnv('NEXT_PUBLIC_BILAN_ENDPOINT', 'https://api.example.com')
      
      try {
        await initializeBilan('test_user')
        
        // Verify debug log contains only safe information
        expect(mockConsoleLog).toHaveBeenCalledWith(
          'Bilan SDK initialized successfully',
          {
            mode: 'server',
            endpoint: 'https://api.example.com'
          }
        )
        
        // Verify it does NOT contain userId in any form
        const debugCalls = mockConsoleLog.mock.calls
        const hasUserIdInLogs = debugCalls.some(call => 
          JSON.stringify(call).includes('userId') || 
          JSON.stringify(call).includes('test_user')
        )
        expect(hasUserIdInLogs).toBe(false)
        
      } finally {
        mockConsoleLog.mockRestore()
      }
    })

    it('should not expose userId in error messages', async () => {
      // Mock console.warn to capture error output
      const mockConsoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {})
      
      // This should trigger initialization but may have warnings
      try {
        await initializeBilan('sensitive_user_456')
        
        // Check all warning calls for sensitive information
        const errorCalls = mockConsoleWarn.mock.calls
        for (const call of errorCalls) {
          const logMessage = JSON.stringify(call)
          expect(logMessage).not.toContain('sensitive_user_456')
        }
        
      } finally {
        mockConsoleWarn.mockRestore()
      }
    })

    it('should not log userId when debug mode is disabled', async () => {
      const mockConsoleLog = vi.spyOn(console, 'log').mockImplementation(() => {})
      
      // Disable debug mode (default)
      vi.stubEnv('NEXT_PUBLIC_DEBUG', 'false')
      
      try {
        await initializeBilan('any_user_id')
        
        // Should not have any debug logs when debug is disabled
        const bilanDebugCalls = mockConsoleLog.mock.calls.filter(call => 
          call[0] && call[0].toString().includes('Bilan SDK initialized')
        )
        expect(bilanDebugCalls).toHaveLength(0)
        
      } finally {
        mockConsoleLog.mockRestore()
      }
    })
  })
}) 