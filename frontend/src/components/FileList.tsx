interface FileListProps {
    files: string[];
  }

function FileList({ files }: FileListProps) {
    return (
        <ul>
            {files.map((file: string, index: number) => (
                <li key={index}>{file}</li>
            ))}
        </ul>
    );
}

export default FileList;