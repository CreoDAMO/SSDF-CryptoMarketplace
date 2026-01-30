> ## Documentation Index
> Fetch the complete documentation index at: https://docs.cdp.coinbase.com/llms.txt
> Use this file to discover all available pages before exploring further.

# Getting Started with AgentKit

AgentKit provides a simple way to create AI agents that can interact with blockchain networks. This guide will show you how to get started using our CLI tools.

<Frame>
  <iframe width="560" height="315" src="https://www.youtube.com/embed/hw-PuogqLR0?si=DMCQY1me93uxjb7Y" title="Getting started with AgentKit" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen className="rounded-lg w-full" />
</Frame>

## Create Your First Agent

<Tabs groupId="programming-language">
  <Tab value="typescript" title="TypeScript" default>
    This section will guide you through the process of creating a new AgentKit project using the TypeScript CLI. Through this process, you will generate a NextJs fullstack application, or a Model Context Protocol server to use with Claude Desktop.

    ### Prerequisites

    Before you begin, make sure you have:

    1. Node.js 18 or later installed – [Download here](https://nodejs.org/)
    2. npm 9 or later installed (comes bundled with Node.js)

    Check your Node.js and npm versions:

    ```bash lines wrap theme={null}
    node --version  # Should be 18+
    npm --version   # Should be 9+
    ```

    ### Creating a New Project

    The fastest way to get started is using our TypeScript CLI:

    ```bash lines wrap theme={null}
    npm create onchain-agent@latest
    ```

    This command will guide you through an interactive setup process:

    1. **Choose your AI Framework**
       * [LangChain](https://js.langchain.com/): Popular framework for building AI applications
       * [Vercel AI SDK](https://sdk.vercel.ai/): Build AI-powered streaming text and chat UIs
       * [Model Context Protocol](https://github.com/modelcontextprotocol/sdk): Standardized protocol for AI model interactions

    2. **Project Template** (based on your framework choice)
       * **LangChain & Vercel AI SDK**: Full-stack Next.js application with:
         * React for the frontend
         * Tailwind CSS for styling
         * ESLint for code quality
         * TypeScript configuration
       * **Model Context Protocol**: MCP server project for Claude Desktop integration

    3. **Blockchain Network**
       * Select from preconfigured networks (Base, EVM, Solana, etc.)
       * Optionally specify custom chain IDs

    4. **Wallet Provider**
       * **CDP Smart Wallets**: Account abstraction with advanced features
       * **CDP Server Wallets**: Secure server-side wallet management
       * **Viem**: Local private key management
       * **Privy Server Wallets**: Managed custody solution
       * **Privy Delegated Embedded Wallets**: Client-side wallets with delegation

    ### Running Your Project

    Follow the instructions displayed in your CLI to get running. Be sure to check:

    * The `.env-local` file in your project root for instructions on obtaining API keys
    * Your generated project's README for additional setup details and customization options

    ### Component Generation

    The CLI also installs the `agentkit` command globally, allowing you to generate additional components.

    These generators will create TypeScript files in your current working directory.

    ```bash lines wrap theme={null}
    # Available generators
    agentkit generate wallet-provider    # Generate a custom wallet provider
    agentkit generate action-provider    # Generate a custom action provider
    agentkit generate prepare            # Generate framework-agnostic AgentKit setup
    agentkit generate create-agent       # Generate framework-specific agent creation
    ```

    > **Note**: If the above commands print the error `agentkit: not found`, ensure the agentkit cli is installed by running the following command:
    >
    > ```bash  theme={null}
    > npm install -g create-onchain-agent/@latest
    > ```
  </Tab>

  <Tab value="python" title="Python">
    This section will guide you through the process of creating a new AgentKit project using the Python CLI. Through this process, you will generate a local chatbot fully integrated with AgentKit.

    ### Prerequisites

    Before you begin, make sure you have:

    1. Python 3.10 or 3.11 installed – [Install Python](https://realpython.com/installing-python/)
    2. Pipx installed – [Install pipx](https://pipx.pypa.io/stable/installation/)

    ```bash lines wrap theme={null}
    python3.10 -m pip install --user pipx
    python3.10 -m pipx ensurepath
    ```

    > **Note**: If you have multiple versions of Python installed, you can specify the Python version when installing pipx.

    ### Creating a New Project

    The fastest way to get started is using our Python CLI:

    ```bash lines wrap theme={null}
    pipx run create-onchain-agent
    ```

    > **Note**: If you want a simplified default setup, you can use the `--beginner` flag:

    This command will guide you through an interactive setup process:

    1. **Choose your AI Framework**
       * [LangChain](https://python.langchain.com/): Popular framework for building AI applications
       * [OpenAI Agents SDK](https://platform.openai.com/docs/guides/agents): OpenAI's lightweight framework for production agents

    2. **Blockchain Network**
       * Select from preconfigured networks (Base, EVM, Solana, etc.)
       * Optionally specify custom chain IDs

    3. **Wallet Provider**
       * **CDP Smart Wallets**: Account abstraction with advanced features
       * **CDP Server Wallets**: Secure server-side wallet management
       * **EthAccount**: Local private key management

    ### Running Your Project

    Follow the instructions displayed in your CLI to get running. Be sure to check:

    * The `.env-local` file in your project root for instructions on obtaining API keys
    * Your generated project's README for additional setup details and customization options
  </Tab>
</Tabs>
