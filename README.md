# Hopper Clip

## What is this?

Ever wish you could just copy and paste your Grasshopper (Rhino 3D) scripts like normal code snippets?
And then actually save and manage them easily, instead of wrestling with messy script libraries?
Well, that's exactly what Hopper Clip is all about!
It's a web-based tool that makes working with your Grasshopper scripts a breeze
– think of it as your personal snippet manager specially created for GH.

## Motivation

Honestly, Hopper Clip was born out of pure frustration (the good kind, of course!).
After years of dealing with Grasshopper, I just couldn't shake the feeling that managing scripts shouldn't be so... annoying.
Why can't we treat GH scripts like actual code?

You know, simple copy-pasting, quick saving as snippets, and even to get some
insghts about the scrips. Like how compelx is this Gh script? There has not been
any common way to asses that.

I know, I know, some of this can be done locally. But I wanted more!
I wanted a web based app, so that my data can stick around, and even better, be shared with others.

That's why I open-sourced Hopper Clip – feel free to use the hosted version ([HopperClip](https://www.hopperclip.com/)),
or grab a copy, fork it, and make it your own.

If you're feeling adventurous and want to join the ride, pull requests are super welcome.

Or hey, just do whatever you want with your fork! No pressure, just good vibes.

## Technologies Used

- **Frontend & Backend:** Vite, TanStack Start, and TanStack Router
- **Backend & Database:** Convex (simplifies hosting with built-in database, storage, and serverless functions)
- **Styling:** Tailwind CSS & Shadcn UI
- **Authentication & User Management:** Clerk
- **Data Analysis:** Posthog

**Deployment:**

- **Application:** Any TanStack Start-compatible Node hosting
- **Backend:** Convex

## Getting Started

Follow these instructions to get a copy of the project up and running on your local machine for development and testing purposes.

### Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (LTS version recommended)
- **pnpm**
- **Git**

You will also need to provide the necessary API keys and environment variables, as shown in the `.env.example` file. This typically includes credentials for Clerk and Convex.

### Installation

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/tsoumdoa/better-gh-lib
    ```
    _(Remember to replace `[YourGitHubUsername]` with your actual GitHub username and adjust `hopperclip.git` if your repo name is different)_
2.  **Navigate into the project directory:**
    ```bash
    cd hopperclip
    ```
3.  **Create a `.env` file:**
    - Copy the `env.example` file to `.env`.
    - Fill in all the required environment variables.

    ```bash
    cp env.example .env
    # Now, open .env and fill in your keys/credentials
    ```

4.  **Install dependencies:**

    ```bash
    pnpm install
    ```

5.  **Setup Convex:**

    ```bash
    pnpm convex dev
    ```

    This will start the Convex dev server and set up your local database and storage.

### Running Locally

To run the development server:

```bash
pnpm run dev
```

The application should now be accessible in your web browser at \(http://localhost:3000\).

### TODO:

-- when param has same name, it doesnt parse corrcectly
-- item out with ++ doesnt work too
