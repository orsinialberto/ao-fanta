import { AlertCircle } from "lucide-react";

export default function InlineError({
  title,
  message,
}: {
  title?: string;
  message: string;
}) {
  return (
    <div
      role="alert"
      className="flex items-start gap-2 rounded-md border border-danger-line bg-danger-bg px-3 py-2"
    >
      <AlertCircle
        size={15}
        strokeWidth={1.8}
        className="mt-px shrink-0 text-danger"
      />
      <p className="text-small text-danger">
        {title && <span className="block font-semibold">{title}</span>}
        {message}
      </p>
    </div>
  );
}
