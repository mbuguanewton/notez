import { Welcome } from "../welcome/welcome";

export function meta() {
  return [
    { title: "Notez - Your Note Taking App" },
    { name: "description", content: "Welcome to Notez, your personal note-taking application!" },
  ];
}

export default function Index() {
  return <Welcome />;
}
