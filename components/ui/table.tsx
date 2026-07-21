import { cn } from "@/lib/utils";
import { ReactNode } from "react";

interface TableProps {
  children: ReactNode;
  className?: string;
  colSpan?: number;
}

export function Table({ children, className }: TableProps) {
  return (
    <div className={cn("w-full overflow-auto", className)}>
      <table className="w-full caption-bottom text-sm">
        {children}
      </table>
    </div>
  );
}

export function TableHeader({ children, className }: TableProps) {
  return (
    <thead className={cn("[&_tr]:border-b [&_tr]:border-zinc-200 dark:[&_tr]:border-zinc-800", className)}>
      {children}
    </thead>
  );
}

export function TableBody({ children, className }: TableProps) {
  return (
    <tbody className={cn("[&_tr:last-child]:border-0", className)}>
      {children}
    </tbody>
  );
}

export function TableRow({ children, className }: TableProps) {
  return (
    <tr className={cn("border-b border-zinc-200 transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900/50", className)}>
      {children}
    </tr>
  );
}

export function TableHead({ children, className }: TableProps) {
  return (
    <th className={cn(
      "h-12 px-4 text-left align-middle font-medium text-zinc-500 dark:text-zinc-400",
      "[&:has([role=checkbox])]:pr-0",
      className
    )}>
      {children}
    </th>
  );
}

export function TableCell({ children, className }: TableProps) {
  return (
    <td className={cn(
      "p-4 align-middle text-zinc-900 dark:text-zinc-50",
      "[&:has([role=checkbox])]:pr-0",
      className
    )}>
      {children}
    </td>
  );
}
