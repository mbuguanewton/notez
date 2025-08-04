import { Link } from "react-router";
import logoDark from "./logo-dark.svg";
import logoLight from "./logo-light.svg";

export function Welcome() {
  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-4rem)] py-16">
      <div className="flex-1 flex flex-col items-center gap-16 max-w-4xl mx-auto px-4">
        <header className="flex flex-col items-center gap-9 text-center">
          <div className="w-[400px] max-w-[90vw]">
            <img
              src={logoLight}
              alt="Notez"
              className="block w-full dark:hidden"
            />
            <img
              src={logoDark}
              alt="Notez"
              className="hidden w-full dark:block"
            />
          </div>
          <div>
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Welcome to Notez
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl">
              Your modern, fast, and intuitive note-taking companion. 
              Start organizing your thoughts and ideas today.
            </p>
          </div>
        </header>
        
        <div className="flex flex-col sm:flex-row gap-4">
          <Link
            to="/notes"
            className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-medium transition-colors text-center"
          >
            View My Notes
          </Link>
          <Link
            to="/about"
            className="border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 px-8 py-3 rounded-lg font-medium transition-colors text-center"
          >
            Learn More
          </Link>
        </div>
        
        <div className="max-w-[600px] w-full space-y-6">
          <div className="rounded-3xl border border-gray-200 p-6 dark:border-gray-700 space-y-4 bg-white dark:bg-gray-800">
            <p className="leading-6 text-gray-700 dark:text-gray-200 text-center font-medium">
              Quick Start Guide
            </p>
            <ul className="space-y-2">
              {quickStartItems.map(({ href, text, icon }) => (
                <li key={href}>
                  <Link
                    className="group flex items-center gap-3 self-stretch p-3 leading-normal text-blue-700 hover:underline dark:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                    to={href}
                  >
                    {icon}
                    {text}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

const quickStartItems = [
  {
    href: "/notes",
    text: "Browse your notes",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
  },
  {
    href: "/notes/1",
    text: "View a sample note",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
      </svg>
    ),
  },
  {
    href: "/about",
    text: "Learn about features",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
];
