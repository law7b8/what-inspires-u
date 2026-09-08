import { useEffect, useMemo, useState } from 'react';
import { usePosts } from '../../context/PostsContext';
import PostCard from '../../components/PostCard/PostCard';
import HomeControls from '../../components/HomeControls/HomeControls';

export default function Home() {
  const { posts, fetchPosts } = usePosts();
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState('newest');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await fetchPosts();
      setLoading(false);
    }
    load();
  }, []);

  const filtered = useMemo(() => {
    let res = posts.filter(p => p.title?.toLowerCase().includes(query.toLowerCase()));

    if (sort === 'newest') res.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    else if (sort === 'most') res.sort((a, b) => (b.upvotes || 0) - (a.upvotes || 0));
    else if (sort === 'random') res.sort(() => Math.random() - 0.5);

    return res;
  }, [posts, query, sort]);

  if (loading) return <h2>Loading posts...</h2>;
  if (!posts.length) return <h2></h2>;

  return (
    <div>
      <HomeControls query={query} setQuery={setQuery} sort={sort} setSort={setSort} />

      <div className="masonry">
        {filtered.map(p => (
          <div key={p.id} className="post-rot" style={{ marginBottom: '1.5rem', breakInside: 'avoid' }}>
            <PostCard post={p} />
          </div>
        ))}
      </div>
    </div>
  );
}
