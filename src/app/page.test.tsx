import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import Page from './page'

describe('Home page', () => {
  it('renders the dashboard heading', () => {
    render(<Page />)
    expect(
      screen.getByRole('heading', { name: /hazmat inventory dashboard/i })
    ).toBeInTheDocument()
  })
})
