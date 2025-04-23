import styles from './index.module.scss'

interface SearchFieldProps {
  keywords: string
  setKeywords: (keywords: string) => void
}

const SearchField = ({ keywords, setKeywords }: SearchFieldProps) => {
  return (
    <div className={styles['input-container']}>
      <input
        type="text"
        placeholder="Keywords, separated, by, comma"
        value={keywords}
        onChange={(e) => setKeywords(e.target.value)}
        aria-label="Search keywords"
      />
      {keywords && (
        <button
          className={styles['clear-button']}
          onClick={() => setKeywords('')}
          aria-label="Clear search"
        />
      )}
    </div>
  )
}

export default SearchField
