interface AnalysisResult {
    matchedSkills: string[];
    missingSkills: string[];
    suggestedProject: {
      title: string;
      description: string;
      skillsItCovers: string[];
    };
    summary: string;
  }

function AnalyzeGaps({matchedSkills, missingSkills, suggestedProject, summary}: AnalysisResult){
    return (
        <div>
            <h2>Analyze Gaps</h2>
            <p>{summary}</p>
            <h3>Matched Skills</h3>
            <ul>
                {matchedSkills.map((skill: string, index: number) => (
                    <li key={index}>{skill}</li>
                ))} 
            </ul>
            <h3>Missing Skills</h3>
            <ul>
                {missingSkills.map((skill: string, index: number) => (
                    <li key={index}>{skill}</li>
                ))}
            </ul>
            <h3>Suggested Project</h3>
            <p>{suggestedProject.title}</p>
            <p>{suggestedProject.description}</p>
            <ul>
                {suggestedProject.skillsItCovers.map((skill: string, index: number) => (
                    <li key={index}>{skill}</li>
                ))}
            </ul>
        </div>
    );
}
export default AnalyzeGaps;