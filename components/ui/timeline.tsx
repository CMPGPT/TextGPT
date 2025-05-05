import React from 'react'
import { cn } from '@/lib/utils'
import { cva } from 'class-variance-authority'

type TimelineItemProps = {
  title: string
  description: string
  icon?: React.ReactNode
  status?: 'completed' | 'current' | 'upcoming'
  color?: 'default' | 'primary' | 'accent' | 'success' | 'warning' | 'danger'
  id: number | string
}

const timelineItemVariants = cva(
  "relative pl-8 pb-8 before:absolute before:left-0 before:top-1 before:h-full before:w-px",
  {
    variants: {
      status: {
        completed: "",
        current: "",
        upcoming: "opacity-60",
      },
      color: {
        default: "before:bg-gray-200",
        primary: "before:bg-primary",
        accent: "before:bg-[#FFB703]",
        success: "before:bg-green-500",
        warning: "before:bg-yellow-500",
        danger: "before:bg-red-500",
      },
      isLast: {
        true: "before:h-0",
        false: "",
      }
    },
    defaultVariants: {
      status: "completed",
      color: "primary",
      isLast: false,
    },
  }
)

const iconVariants = cva(
  "absolute left-0 top-0 flex h-6 w-6 -translate-x-1/2 items-center justify-center rounded-full border text-xs",
  {
    variants: {
      status: {
        completed: "",
        current: "",
        upcoming: "",
      },
      color: {
        default: "border-gray-200 bg-white text-gray-700",
        primary: "border-primary bg-primary text-primary-foreground",
        accent: "border-[#FFB703] bg-[#FFB703] text-textgpt-200",
        success: "border-green-500 bg-green-500 text-white",
        warning: "border-yellow-500 bg-yellow-500 text-white",
        danger: "border-red-500 bg-red-500 text-white",
      },
    },
    defaultVariants: {
      status: "completed",
      color: "primary",
    },
  }
)

function TimelineItem({
  title,
  description,
  icon,
  status = "completed",
  color = "primary",
  id,
  isLast = false
}: TimelineItemProps & { isLast?: boolean }) {
  return (
    <div key={id} className={cn(timelineItemVariants({ status, color, isLast }))}>
      <div className={cn(iconVariants({ status, color }))}>
        {icon || (status === "completed" ? "✓" : id)}
      </div>
      <h3 className="font-medium text-lg text-white">{title}</h3>
      <p className="mt-1 text-white/80">{description}</p>
    </div>
  )
}

type TimelineLayoutProps = {
  items: TimelineItemProps[]
  className?: string
  animate?: boolean
}

export function TimelineLayout({
  items,
  className,
  animate = false,
}: TimelineLayoutProps) {
  return (
    <div className={cn("space-y-0", className)}>
      {items.map((item, index) => (
        <TimelineItem
          key={item.id}
          {...item}
          isLast={index === items.length - 1}
        />
      ))}
    </div>
  )
} 