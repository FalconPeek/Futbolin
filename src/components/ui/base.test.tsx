import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import { Button } from "./button"
import { Input } from "./input"
import { Badge } from "./badge"
import { Card } from "./card"

describe("Button", () => {
  it("renders with primary variant by default", () => {
    const { container } = render(<Button>Click me</Button>)
    const button = container.querySelector("button")
    expect(button).toHaveClass("bg-primary")
  })

  it("renders with secondary variant", () => {
    const { container } = render(<Button variant="secondary">Click me</Button>)
    const button = container.querySelector("button")
    expect(button).toHaveClass("bg-secondary")
  })

  it("renders with ghost variant", () => {
    const { container } = render(<Button variant="ghost">Click me</Button>)
    const button = container.querySelector("button")
    expect(button).toHaveClass("hover:bg-accent")
  })

  it("renders with destructive variant", () => {
    const { container } = render(<Button variant="destructive">Delete</Button>)
    const button = container.querySelector("button")
    expect(button).toHaveClass("bg-destructive")
  })

  it("renders with md size by default (h-tap)", () => {
    const { container } = render(<Button>Click me</Button>)
    const button = container.querySelector("button")
    expect(button).toHaveClass("h-tap")
  })

  it("renders with sm size (h-9)", () => {
    const { container } = render(<Button size="sm">Click me</Button>)
    const button = container.querySelector("button")
    expect(button).toHaveClass("h-9")
  })

  it("renders with lg size (h-[52px])", () => {
    const { container } = render(<Button size="lg">Click me</Button>)
    const button = container.querySelector("button")
    expect(button).toHaveClass("h-[52px]")
  })

  it("renders with block prop (w-full)", () => {
    const { container } = render(<Button block>Click me</Button>)
    const button = container.querySelector("button")
    expect(button).toHaveClass("w-full")
  })

  it("renders with outline variant", () => {
    const { container } = render(<Button variant="outline">Click me</Button>)
    const button = container.querySelector("button")
    expect(button).toHaveClass("border")
  })

  it("renders with link variant", () => {
    const { container } = render(<Button variant="link">Click me</Button>)
    const button = container.querySelector("button")
    expect(button).toHaveClass("text-primary")
  })

  it("renders icon sizes", () => {
    const { container: container1 } = render(<Button size="icon-sm">X</Button>)
    const button1 = container1.querySelector("button")
    expect(button1).toHaveClass("h-7")

    const { container: container2 } = render(<Button size="icon">X</Button>)
    const button2 = container2.querySelector("button")
    expect(button2).toHaveClass("h-tap")
  })
})

describe("Input", () => {
  it("renders with label", () => {
    render(<Input label="Email" />)
    const label = screen.getByText("Email")
    expect(label).toBeInTheDocument()
  })

  it("renders with hint text", () => {
    render(<Input label="Email" hint="Enter your email address" />)
    const hint = screen.getByText("Enter your email address")
    expect(hint).toBeInTheDocument()
    expect(hint).toHaveClass("text-muted-foreground")
  })

  it("renders with error state", () => {
    render(<Input label="Email" error="Email is required" />)
    const error = screen.getByText("Email is required")
    expect(error).toBeInTheDocument()
    expect(error).toHaveClass("text-destructive")
  })

  it("applies aria-invalid when error is present", () => {
    const { container } = render(<Input label="Email" error="Email is required" />)
    const input = container.querySelector("input")
    expect(input).toHaveAttribute("aria-invalid", "true")
  })

  it("does not apply aria-invalid when no error", () => {
    const { container } = render(<Input label="Email" />)
    const input = container.querySelector("input")
    expect(input).toHaveAttribute("aria-invalid", "false")
  })

  it("applies aria-describedby for error", () => {
    const { container } = render(<Input label="Email" error="Email is required" />)
    const input = container.querySelector("input")
    const describedBy = input?.getAttribute("aria-describedby")
    expect(describedBy).toBeTruthy()
    const element = document.getElementById(describedBy!)
    expect(element).toHaveTextContent("Email is required")
  })

  it("applies aria-describedby for hint", () => {
    const { container } = render(<Input label="Email" hint="Enter your email" />)
    const input = container.querySelector("input")
    const describedBy = input?.getAttribute("aria-describedby")
    expect(describedBy).toBeTruthy()
    const element = document.getElementById(describedBy!)
    expect(element).toHaveTextContent("Enter your email")
  })

  it("replaces hint with error when both present", () => {
    const { container } = render(
      <Input label="Email" hint="Enter your email" error="Email is required" />
    )
    const input = container.querySelector("input")
    const describedBy = input?.getAttribute("aria-describedby")
    const element = document.getElementById(describedBy!)
    expect(element).toHaveTextContent("Email is required")
    expect(screen.queryByText("Enter your email")).not.toBeInTheDocument()
  })

  it("applies error border color when error is present", () => {
    const { container } = render(<Input label="Email" error="Email is required" />)
    const input = container.querySelector("input")
    expect(input).toHaveClass("border-destructive")
  })

  it("renders with h-tap height", () => {
    const { container } = render(<Input label="Email" />)
    const input = container.querySelector("input")
    expect(input).toHaveClass("h-tap")
  })
})

describe("Badge", () => {
  it("renders with neutral variant by default", () => {
    const { container } = render(<Badge>Neutral</Badge>)
    const badge = container.querySelector("span")
    expect(badge).toHaveClass("bg-muted")
  })

  it("renders with primary variant", () => {
    const { container } = render(<Badge variant="primary">Primary</Badge>)
    const badge = container.querySelector("span")
    expect(badge).toHaveClass("bg-primary")
  })

  it("renders with gold variant (outlined)", () => {
    const { container } = render(<Badge variant="gold">Gold</Badge>)
    const badge = container.querySelector("span")
    expect(badge).toHaveClass("bg-transparent")
    expect(badge).toHaveClass("text-gold")
    expect(badge).toHaveClass("border-gold")
  })

  it("renders with info variant (outlined)", () => {
    const { container } = render(<Badge variant="info">Info</Badge>)
    const badge = container.querySelector("span")
    expect(badge).toHaveClass("bg-transparent")
    expect(badge).toHaveClass("text-info")
    expect(badge).toHaveClass("border-info")
  })

  it("renders with destructive variant", () => {
    const { container } = render(<Badge variant="destructive">Destructive</Badge>)
    const badge = container.querySelector("span")
    expect(badge).toHaveClass("bg-destructive")
  })

  it("has correct height and padding", () => {
    const { container } = render(<Badge>Test</Badge>)
    const badge = container.querySelector("span")
    expect(badge).toHaveClass("h-6")
    expect(badge).toHaveClass("px-2")
  })

  it("has rounded-sm radius", () => {
    const { container } = render(<Badge>Test</Badge>)
    const badge = container.querySelector("span")
    expect(badge).toHaveClass("rounded-sm")
  })
})

describe("Card", () => {
  it("renders basic card", () => {
    const { container } = render(<Card>Content</Card>)
    const card = container.querySelector("[data-slot=card]")
    expect(card).toHaveClass("bg-card")
    expect(card).toHaveClass("rounded-lg")
  })

  it("renders with title", () => {
    render(<Card title="Card Title">Content</Card>)
    const title = screen.getByText("Card Title")
    expect(title).toBeInTheDocument()
    expect(title).toHaveClass("text-title")
  })

  it("renders with subtitle", () => {
    render(<Card title="Title" subtitle="Card Subtitle">Content</Card>)
    const subtitle = screen.getByText("Card Subtitle")
    expect(subtitle).toBeInTheDocument()
    expect(subtitle).toHaveClass("text-muted-foreground")
  })

  it("renders with action", () => {
    render(
      <Card title="Title" action={<button>Action</button>}>
        Content
      </Card>
    )
    const action = screen.getByRole("button", { name: "Action" })
    expect(action).toBeInTheDocument()
  })

  it("uses rounded-lg for radius", () => {
    const { container } = render(<Card>Content</Card>)
    const card = container.querySelector("[data-slot=card]")
    expect(card).toHaveClass("rounded-lg")
  })

  it("has correct padding and spacing", () => {
    const { container } = render(<Card>Content</Card>)
    const card = container.querySelector("[data-slot=card]")
    expect(card).toHaveClass("p-4")
  })

  it("has shadow-sm", () => {
    render(<Card>Content</Card>)
    const card = document.querySelector("[data-slot=card]")
    expect(card).toHaveClass("shadow-sm")
  })

  it("renders children", () => {
    render(<Card>Test Content</Card>)
    expect(screen.getByText("Test Content")).toBeInTheDocument()
  })
})
