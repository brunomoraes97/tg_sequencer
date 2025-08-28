import React, { useState } from 'react';

interface SearchFiltersProps {
  onSearch: (query: string) => void;
  onFilterChange: (filters: any) => void;
  placeholder?: string;
  filters?: Array<{
    key: string;
    label: string;
    type: 'select' | 'text' | 'date';
    options?: Array<{ value: string; label: string }>;
  }>;
}

const SearchFilters: React.FC<SearchFiltersProps> = ({
  onSearch,
  onFilterChange,
  placeholder = 'Search...',
  filters = []
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilters, setActiveFilters] = useState<Record<string, any>>({});
  const [showFilters, setShowFilters] = useState(false);

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    onSearch(value);
  };

  const handleFilterChange = (key: string, value: any) => {
    const newFilters = { ...activeFilters, [key]: value };
    if (!value) {
      delete newFilters[key];
    }
    setActiveFilters(newFilters);
    onFilterChange(newFilters);
  };

  const clearAllFilters = () => {
    setSearchQuery('');
    setActiveFilters({});
    onSearch('');
    onFilterChange({});
  };

  const activeFilterCount = Object.keys(activeFilters).length + (searchQuery ? 1 : 0);

  return (
    <div className="search-filters">
      <div className="search-bar">
        <div className="search-input-wrapper">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            placeholder={placeholder}
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="search-input"
          />
          {searchQuery && (
            <button
              className="clear-search"
              onClick={() => handleSearchChange('')}
            >
              ✖
            </button>
          )}
        </div>
        
        <button
          className={`filter-toggle ${showFilters ? 'active' : ''}`}
          onClick={() => setShowFilters(!showFilters)}
        >
          🔧 Filters {activeFilterCount > 0 && `(${activeFilterCount})`}
        </button>
        
        {activeFilterCount > 0 && (
          <button className="clear-all" onClick={clearAllFilters}>
            Clear All
          </button>
        )}
      </div>

      {showFilters && filters.length > 0 && (
        <div className="filters-panel">
          {filters.map(filter => (
            <div key={filter.key} className="filter-item">
              <label>{filter.label}</label>
              {filter.type === 'select' && (
                <select
                  value={activeFilters[filter.key] || ''}
                  onChange={(e) => handleFilterChange(filter.key, e.target.value)}
                >
                  <option value="">All</option>
                  {filter.options?.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              )}
              {filter.type === 'text' && (
                <input
                  type="text"
                  value={activeFilters[filter.key] || ''}
                  onChange={(e) => handleFilterChange(filter.key, e.target.value)}
                  placeholder={`Filter by ${filter.label.toLowerCase()}`}
                />
              )}
              {filter.type === 'date' && (
                <input
                  type="date"
                  value={activeFilters[filter.key] || ''}
                  onChange={(e) => handleFilterChange(filter.key, e.target.value)}
                />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SearchFilters;
