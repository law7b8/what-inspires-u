import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { usePosts } from '../../context/PostsContext'

// The "fill out sheet" for a new post. Shared by the /new page and the
// Hero's post-img sheet so both stay identical. `className` is appended to
// the polaroid card so a host can restyle it (the Hero slides it out from
// behind the "post img" option and strips the page margins).
export default function PostForm({ className = '', onCancel }) {
  const { createPost } = usePosts()
  const navigate = useNavigate()

  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [tags, setTags] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!title.trim()) return alert('Title is required')

    setLoading(true)
    try {
      const newPost = await createPost({
        title: title.trim().toLowerCase(),
        content,
        imageURL: imageUrl,
        tags: tags.split(',').map(t => t.trim()).filter(Boolean).join(',')
      })

      navigate(`/post/${newPost.id}`)
    } catch (err) {
      console.error('Failed to create post:', err)
      alert('Failed to create post')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className={`polaroid ${className}`.trim()}>
      <label>Title</label>
      <input value={title} onChange={e => setTitle(e.target.value)} />

      <label>Content</label>
      <textarea value={content} onChange={e => setContent(e.target.value)} />

      <label>Image URL </label>
      <input value={imageUrl} onChange={e => setImageUrl(e.target.value)} />

      <label>Feelings / Tags (comma separated)</label>
      <input value={tags} onChange={e => setTags(e.target.value)} />

      <div style={{ display: 'flex', gap: '0.75rem' }}>
        <button type="submit" className="btn btn-success" disabled={loading}>
          {loading ? 'Sharing...' : 'Share'}
        </button>
        {onCancel && (
          <button type="button" className="btn" onClick={onCancel}>
            Cancel
          </button>
        )}
      </div>
    </form>
  )
}
