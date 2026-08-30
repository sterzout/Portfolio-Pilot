interface RecentCommitsProps {
    commits: {
        message: string;
        date: string;
    }[];
}

function RecentCommits({commits}: RecentCommitsProps){
        if (commits.length === 0) {
            return <div>No commits found</div>;
        }   
        return (
            <div>
                <h2>Recent Commits</h2>
                <ul>
                    {commits.map((commit) => (
                        <li key={commit.message}>
                            <span className="commit-msg">{commit.message}</span>
                            <span className="commit-date">{new Date(commit.date).toLocaleDateString()}</span>
                        </li>
                    ))}
                </ul>
            </div>
        );
}
export default RecentCommits;