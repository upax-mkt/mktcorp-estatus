import { describe, it, expect } from 'vitest'
import { saludo } from './saludo'

describe('saludo', () => {
  it('nombra el proyecto', () => {
    expect(saludo()).toBe('mktcorp-estatus')
  })
})
