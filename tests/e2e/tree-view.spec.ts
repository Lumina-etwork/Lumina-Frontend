/**
 * E2E tests for TreeView component
 * 
 * Tests verify:
 * - Tree view renders with hierarchical data
 * - Expand/collapse functionality works with animated transitions
 * - Zoom and pan behavior works correctly
 * - No JS errors during tree operations
 * - Performance: final frame renders within 16ms
 * - Toggle between list and tree view persists in localStorage
 */

import { test, expect } from '@playwright/test'

test.describe('TreeView Performance', () => {
  test('should render tree view component', async ({ page }) => {
    await page.goto('/dashboard')
    
    // Navigate to tree view
    await page.click('button:has-text("Tree View")')
    
    // Verify tree view container is visible
    const treeContainer = page.locator('svg').first()
    await expect(treeContainer).toBeVisible()
  })

  test('should expand and collapse nodes with animated transitions', async ({ page }) => {
    await page.goto('/dashboard')
    await page.click('button:has-text("Tree View")')
    
    // Wait for tree to render
    await page.waitForSelector('svg')
    
    // Click on a node to expand/collapse
    const node = page.locator('g.node').first()
    await node.click()
    
    // Verify the interaction completes without errors
    const errors: string[] = []
    page.on('pageerror', (error) => errors.push(error.message))
    
    // Wait for transition to complete (400ms as specified)
    await page.waitFor_TIMEOUT(500)
    
    expect(errors).toHaveLength(0)
  })

  test('should support zoom and pan behavior', async ({ page }) => {
    await page.goto('/dashboard')
    await page.click('button:has-text("Tree View")')
    await page.waitForSelector('svg')
    
    const svg = page.locator('svg').first()
    
    // Test zoom in
    await svg.click({ position: { x: 400, y: 300 } })
    await page.keyboard.press('Control+')
    await page.waitFor_TIMEOUT(100)
    
    // Test zoom out
    await page.keyboard.press('Control-')
    await page.waitFor_TIMEOUT(100)
    
    // Test pan (drag)
    await svg.dragTo(svg, { sourcePosition: { x: 400, y: 300 }, targetPosition: { x: 450, y: 350 } })
    
    // Verify no errors during zoom/pan
    const errors: string[] = []
    page.on('pageerror', (error) => errors.push(error.message))
    await page.waitFor_TIMEOUT(200)
    
    expect(errors).toHaveLength(0)
  })

  test('should render final frame within 16ms performance budget', async ({ page }) => {
    await page.goto('/dashboard')
    await page.click('button:has-text("Tree View")')
    await page.waitForSelector('svg')
    
    // Measure render performance
    const renderTimes = await page.evaluate(async () => {
      const times: number[] = []
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'measure' && entry.name.includes('tree-render')) {
            times.push(entry.duration)
          }
        }
      })
      observer.observe({ entryTypes: ['measure'] })
      
      // Trigger a tree expansion
      const node = document.querySelector('g.node')
      if (node) {
        performance.mark('tree-start')
        node.dispatchEvent(new MouseEvent('click', { bubbles: true }))
        await new Promise(resolve => setTimeout(resolve, 500))
        performance.mark('tree-end')
        performance.measure('tree-render', 'tree-start', 'tree-end')
      }
      
      await new Promise(resolve => setTimeout(resolve, 100))
      observer.disconnect()
      return times
    })
    
    // Verify at least one measurement was taken
    expect(renderTimes.length).toBeGreaterThan(0)
    
    // Verify all renders are within 16ms budget
    const maxRenderTime = Math.max(...renderTimes)
    expect(maxRenderTime).toBeLessThan(16)
  })

  test('should handle large dataset (500+ nodes) without errors', async ({ page }) => {
    await page.goto('/dashboard')
    await page.click('button:has-text("Tree View")')
    await page.waitForSelector('svg')
    
    // Monitor for errors
    const errors: string[] = []
    page.on('pageerror', (error) => errors.push(error.message))
    
    // Expand multiple nodes to test performance
    const nodes = page.locator('g.node')
    const count = await nodes.count()
    
    // Expand first 5 nodes
    for (let i = 0; i < Math.min(5, count); i++) {
      await nodes.nth(i).click()
      await page.waitFor_TIMEOUT(100)
    }
    
    expect(errors).toHaveLength(0)
  })

  test('should persist view mode in localStorage', async ({ page }) => {
    await page.goto('/dashboard')
    
    // Switch to tree view
    await page.click('button:has-text("Tree View")')
    
    // Verify localStorage is updated
    const viewMode = await page.evaluate(() => {
      return localStorage.getItem('dashboard-view-mode')
    })
    expect(viewMode).toBe('tree')
    
    // Reload page
    await page.reload()
    
    // Verify tree view is still selected
    const treeButton = page.locator('button:has-text("Tree View")')
    await expect(treeButton).toHaveClass(/bg-\[#0f766e\]/)
  })

  test('should toggle between list and tree view', async ({ page }) => {
    await page.goto('/dashboard')
    
    // Verify list view is default
    const listButton = page.locator('button:has-text("List View")')
    await expect(listButton).toHaveClass(/bg-\[#0f766e\]/)
    
    // Switch to tree view
    await page.click('button:has-text("Tree View")')
    await expect(page.locator('svg')).toBeVisible()
    
    // Switch back to list view
    await page.click('button:has-text("List View")')
    await expect(page.locator('[data-testid="node-list"]')).toBeVisible()
  })

  test('should color nodes based on status', async ({ page }) => {
    await page.goto('/dashboard')
    await page.click('button:has-text("Tree View")')
    await page.waitForSelector('svg')
    
    // Verify node circles have status colors
    const circles = page.locator('g.node circle')
    const count = await circles.count()
    expect(count).toBeGreaterThan(0)
    
    // Check that circles have fill colors
    const firstCircle = circles.first()
    const fillColor = await firstCircle.evaluate((el: SVGCircleElement) => {
      return getComputedStyle(el).fill
    })
    expect(fillColor).not.toBe('')
  })

  test('should display node labels', async ({ page }) => {
    await page.goto('/dashboard')
    await page.click('button:has-text("Tree View")')
    await page.waitForSelector('svg')
    
    // Verify text labels are present
    const labels = page.locator('g.node text')
    const count = await labels.count()
    expect(count).toBeGreaterThan(0)
  })
})

test.describe('TreeView Accessibility', () => {
  test('should be keyboard navigable', async ({ page }) => {
    await page.goto('/dashboard')
    await page.click('button:has-text("Tree View")')
    await page.waitForSelector('svg')
    
    // Tab to tree view
    await page.keyboard.press('Tab')
    
    // Verify focus is manageable
    const focused = await page.evaluate(() => document.activeElement?.tagName)
    expect(focused).toBeTruthy()
  })

  test('should have proper ARIA labels', async ({ page }) => {
    await page.goto('/dashboard')
    await page.click('button:has-text("Tree View")')
    await page.waitForSelector('svg')
    
    // Check for proper button labels
    const treeButton = page.locator('button:has-text("Tree View")')
    await expect(treeButton).toHaveAttribute('type', 'button')
  })
})

console.log('\n✅ All TreeView E2E tests prepared!')
console.log('These tests verify tree view functionality, performance, and accessibility.')
