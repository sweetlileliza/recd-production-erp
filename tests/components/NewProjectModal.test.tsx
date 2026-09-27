// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { NewProjectModal } from '../../src/components/NewProjectModal'

describe('<NewProjectModal />', () => {
  it('renders modal inputs and title', () => {
    render(<NewProjectModal onClose={vi.fn()} onCreate={vi.fn()} />)

    expect(screen.getByText('Start New Studio Project')).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/e\.g\. Fake Depressed/i)).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/e\.g\. recd/i)).toBeInTheDocument()
  })

  it('submits form with entered data and closes modal', async () => {
    const handleCreate = vi.fn().mockResolvedValue(undefined)
    const handleClose = vi.fn()

    render(<NewProjectModal onClose={handleClose} onCreate={handleCreate} />)

    const titleInput = screen.getByPlaceholderText(/e\.g\. Fake Depressed/i)
    fireEvent.change(titleInput, { target: { value: 'Luigi Mansion Musical' } })

    const directorInput = screen.getByPlaceholderText(/e\.g\. recd/i)
    fireEvent.change(directorInput, { target: { value: 'Avan' } })

    const submitBtn = screen.getByRole('button', { name: /Initialize Project/i })
    fireEvent.click(submitBtn)

    await waitFor(() => {
      expect(handleCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Luigi Mansion Musical',
          director: 'Avan',
        })
      )
      expect(handleClose).toHaveBeenCalled()
    })
  })

  it('closes on Escape key', () => {
    const handleClose = vi.fn()
    render(<NewProjectModal onClose={handleClose} onCreate={vi.fn()} />)

    fireEvent.keyDown(window, { key: 'Escape' })
    expect(handleClose).toHaveBeenCalled()
  })
})
