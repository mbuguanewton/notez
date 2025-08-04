export function meta() {
  return [
    { title: "About - Notez" },
    { name: "description", content: "Learn more about Notez and its features." },
  ];
}

export default function About() {
  return (
    <div className="container mx-auto px-4 py-16">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-8">
          About Notez
        </h1>
        <div className="prose prose-lg dark:prose-invert">
          <p className="text-xl text-gray-600 dark:text-gray-300 mb-6">
            Notez is a modern, fast, and intuitive note-taking application built with React Router v7 and Tailwind CSS.
          </p>
          <div className="grid md:grid-cols-2 gap-8 mt-12">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                Fast & Responsive
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                Built with modern web technologies for lightning-fast performance and seamless user experience.
              </p>
            </div>
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                Beautiful Design
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                Clean, modern interface with full dark mode support and responsive design across all devices.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
