interface LanguagesListProps {
    languages: string[];
}

function LanguagesList({languages}: LanguagesListProps){
    if (languages.length === 0) {
        return <div>No languages found</div>;
    }
    return (
        <div>
            <h2>Languages</h2>
            <ul>
                {languages.map((language) => (
                    <li key={language}>{language}</li>
                ))}
            </ul>            
        </div>
    );
}
export default LanguagesList;