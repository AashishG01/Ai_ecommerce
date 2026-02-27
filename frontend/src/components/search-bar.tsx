'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Search } from 'lucide-react';
import { useDebounce } from '@/hooks/use-debounce';
import { getAiSuggestions } from '@/app/actions';
import { Input } from './ui/input';
import { Card, CardContent } from './ui/card';

export default function SearchBar() {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const debouncedQuery = useDebounce(query, 300);
  const router = useRouter();
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchSuggestions = async () => {
      if (debouncedQuery.length > 1) {
        setIsLoading(true);
        const result = await getAiSuggestions(debouncedQuery);
        setSuggestions(result);
        setIsLoading(false);
      } else {
        setSuggestions([]);
      }
    };

    fetchSuggestions();
  }, [debouncedQuery]);
  
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsFocused(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [wrapperRef]);


  const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/search?q=${encodeURIComponent(query)}`);
      setIsFocused(false);
    }
  };
  
  const handleSuggestionClick = (suggestion: string) => {
    setQuery(suggestion);
    router.push(`/search?q=${encodeURIComponent(suggestion)}`);
    setIsFocused(false);
  }

  return (
    <div className="relative w-full max-w-md" ref={wrapperRef}>
      <form onSubmit={handleSearch}>
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Search products..."
          className="w-full rounded-full bg-muted pl-10"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsFocused(true)}
        />
        {isLoading && <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />}
      </form>
      {isFocused && (suggestions.length > 0 || isLoading) && (
        <Card className="absolute top-full z-10 mt-2 w-full">
          <CardContent className="p-2">
            {isLoading && !suggestions.length ? (
                <div className="p-2 text-center text-sm text-muted-foreground">Loading suggestions...</div>
            ) : (
                <ul className="space-y-1">
                {suggestions.map((suggestion, index) => (
                    <li key={index}>
                    <button
                        onClick={() => handleSuggestionClick(suggestion)}
                        className="w-full rounded-sm p-2 text-left text-sm hover:bg-accent"
                    >
                        {suggestion}
                    </button>
                    </li>
                ))}
                </ul>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
