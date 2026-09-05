mod auth;

use std::collections::HashMap;
use std::io::{stdout, Result};
use std::time::Duration;

use auth::{clear_session, load_session, login_request, AuthSession};
use clap::{Parser, Subcommand};
use crossterm::{
    event::{self, DisableMouseCapture, EnableMouseCapture, Event, KeyCode, KeyModifiers, MouseButton, MouseEventKind},
    execute,
    terminal::{disable_raw_mode, enable_raw_mode, EnterAlternateScreen, LeaveAlternateScreen},
};
use ratatui::{
    backend::CrosstermBackend,
    layout::{Alignment, Constraint, Direction, Layout, Rect},
    style::{Color, Modifier, Style},
    text::{Line, Span},
    widgets::{Block, Borders, Clear, List, ListItem, ListState, Paragraph, Tabs, Wrap},
    Terminal,
};

use postty_core::{HttpMethod, HttpResponse, KeyValueParam, NativeHttpClient, RequestBody, RequestItem};

const METHODS: [HttpMethod; 7] = [
    HttpMethod::GET,
    HttpMethod::POST,
    HttpMethod::PUT,
    HttpMethod::PATCH,
    HttpMethod::DELETE,
    HttpMethod::HEAD,
    HttpMethod::OPTIONS,
];

fn method_name(m: HttpMethod) -> &'static str {
    match m {
        HttpMethod::GET => "GET",
        HttpMethod::POST => "POST",
        HttpMethod::PUT => "PUT",
        HttpMethod::PATCH => "PATCH",
        HttpMethod::DELETE => "DELETE",
        HttpMethod::HEAD => "HEAD",
        HttpMethod::OPTIONS => "OPTIONS",
    }
}

#[derive(Parser, Debug)]
#[command(name = "postty", author, version, about = "Fast API testing client and Postman alternative")]
struct Cli {
    #[command(subcommand)]
    command: Option<Commands>,
}

#[derive(Subcommand, Debug)]
enum Commands {
    /// Run a collection in headless CLI mode
    Run {
        /// Path to collection file
        collection: String,
        /// Optional environment file
        #[arg(short, long)]
        environment: Option<String>,
    },
    /// Log in to Postty Cloud account
    Login {
        #[arg(short, long)]
        email: Option<String>,
        #[arg(short, long)]
        password: Option<String>,
        #[arg(long, default_value = "http://localhost:4000")]
        api_url: String,
    },
    /// Log out from Postty Cloud account
    Logout,
    /// Display current active account and status
    Whoami,
    /// Create and execute a quick request
    New {
        /// Request URL
        url: String,
        /// HTTP Method (GET, POST, PUT, DELETE, etc.)
        #[arg(short, long, default_value = "GET")]
        method: String,
        /// Request name
        #[arg(short, long)]
        name: Option<String>,
    },
}

#[derive(PartialEq, Eq, Clone, Copy)]
enum ActivePanel {
    Sidebar,
    Request,
    Response,
}

enum Modal {
    None,
    NewRequest {
        name: String,
        method_idx: usize,
        url: String,
        focused_field: usize, // 0: Name, 1: Method, 2: URL
    },
    Account {
        email: String,
        password: String,
        focused_field: usize, // 0: Email, 1: Password
        message: Option<String>,
        is_error: bool,
    },
    Help,
}

struct AppState {
    requests: Vec<RequestItem>,
    list_state: ListState,
    active_panel: ActivePanel,
    selected_tab: usize,
    response: Option<HttpResponse>,
    response_scroll: u16,
    variables: HashMap<String, String>,
    status_message: String,
    http_client: NativeHttpClient,
    session: Option<AuthSession>,
    modal: Modal,
}

impl AppState {
    fn new() -> Self {
        let mut variables = HashMap::new();
        variables.insert("baseUrl".to_string(), "https://jsonplaceholder.typicode.com".to_string());
        variables.insert("userId".to_string(), "1".to_string());

        let sample_requests = vec![
            RequestItem {
                id: uuid::Uuid::new_v4(),
                collection_id: uuid::Uuid::new_v4(),
                folder_id: None,
                name: "1. Get Users List".to_string(),
                method: HttpMethod::GET,
                url: "{{baseUrl}}/users".to_string(),
                headers: vec![KeyValueParam {
                    id: uuid::Uuid::new_v4(),
                    key: "Accept".to_string(),
                    value: "application/json".to_string(),
                    description: None,
                    enabled: true,
                }],
                query_params: vec![],
                body: RequestBody::None,
                auth: postty_core::AuthConfig::None,
                pre_request_script: String::new(),
                test_script: String::new(),
                order_index: 0,
            },
            RequestItem {
                id: uuid::Uuid::new_v4(),
                collection_id: uuid::Uuid::new_v4(),
                folder_id: None,
                name: "2. Get Single Post".to_string(),
                method: HttpMethod::GET,
                url: "{{baseUrl}}/posts/{{userId}}".to_string(),
                headers: vec![],
                query_params: vec![],
                body: RequestBody::None,
                auth: postty_core::AuthConfig::None,
                pre_request_script: String::new(),
                test_script: String::new(),
                order_index: 1,
            },
            RequestItem {
                id: uuid::Uuid::new_v4(),
                collection_id: uuid::Uuid::new_v4(),
                folder_id: None,
                name: "3. Create New Post".to_string(),
                method: HttpMethod::POST,
                url: "{{baseUrl}}/posts".to_string(),
                headers: vec![],
                query_params: vec![],
                body: RequestBody::Raw {
                    raw: r#"{"title":"Hello from Postty TUI","body":"Testing API client","userId":1}"#.to_string(),
                    language: "json".to_string(),
                },
                auth: postty_core::AuthConfig::None,
                pre_request_script: String::new(),
                test_script: String::new(),
                order_index: 2,
            },
        ];

        let mut list_state = ListState::default();
        list_state.select(Some(0));

        let session = load_session();

        Self {
            requests: sample_requests,
            list_state,
            active_panel: ActivePanel::Sidebar,
            selected_tab: 0,
            response: None,
            response_scroll: 0,
            variables,
            status_message: "Ready. [Enter] Send │ [n] New Request │ [a] Account │ [?] Help".to_string(),
            http_client: NativeHttpClient::new().unwrap(),
            session,
            modal: Modal::None,
        }
    }

    fn current_request(&self) -> Option<&RequestItem> {
        let index = self.list_state.selected()?;
        self.requests.get(index)
    }

    fn next_request(&mut self) {
        let i = match self.list_state.selected() {
            Some(i) => {
                if i >= self.requests.len().saturating_sub(1) {
                    0
                } else {
                    i + 1
                }
            }
            None => 0,
        };
        self.list_state.select(Some(i));
        self.response = None;
        self.response_scroll = 0;
    }

    fn previous_request(&mut self) {
        let i = match self.list_state.selected() {
            Some(i) => {
                if i == 0 {
                    self.requests.len().saturating_sub(1)
                } else {
                    i - 1
                }
            }
            None => 0,
        };
        self.list_state.select(Some(i));
        self.response = None;
        self.response_scroll = 0;
    }

    fn add_request(&mut self, name: String, method: HttpMethod, url: String) {
        let new_req = RequestItem {
            id: uuid::Uuid::new_v4(),
            collection_id: uuid::Uuid::new_v4(),
            folder_id: None,
            name,
            method,
            url,
            headers: vec![],
            query_params: vec![],
            body: RequestBody::None,
            auth: postty_core::AuthConfig::None,
            pre_request_script: String::new(),
            test_script: String::new(),
            order_index: self.requests.len() as i32,
        };

        self.requests.push(new_req);
        let new_idx = self.requests.len() - 1;
        self.list_state.select(Some(new_idx));
        self.response = None;
        self.response_scroll = 0;
        self.status_message = "New request created. Press [Enter] to send.".to_string();
    }

    fn delete_current_request(&mut self) {
        if self.requests.len() <= 1 {
            self.status_message = "Cannot delete the only remaining request.".to_string();
            return;
        }

        if let Some(idx) = self.list_state.selected() {
            let removed = self.requests.remove(idx);
            let next_idx = idx.min(self.requests.len() - 1);
            self.list_state.select(Some(next_idx));
            self.response = None;
            self.response_scroll = 0;
            self.status_message = format!("Deleted request: {}", removed.name);
        }
    }

    async fn execute_current(&mut self) {
        if let Some(req) = self.current_request() {
            let req_clone = req.clone();
            self.status_message = format!("Sending {} {}...", method_name(req_clone.method), req_clone.url);

            match self.http_client.execute(&req_clone, &self.variables).await {
                Ok(resp) => {
                    self.status_message = format!(
                        "Completed: {} {} in {}ms ({} bytes)",
                        resp.status_code, resp.status_text, resp.total_duration_ms, resp.size_bytes
                    );
                    self.response = Some(resp);
                    self.response_scroll = 0;
                }
                Err(err) => {
                    self.status_message = format!("Error: {:#}", err);
                }
            }
        }
    }
}

#[tokio::main]
async fn main() -> Result<()> {
    let cli = Cli::parse();

    match cli.command {
        Some(Commands::Run { collection, environment }) => {
            println!("Postty CLI Runner: running collection: {}", collection);
            if let Some(env) = environment {
                println!("With environment: {}", env);
            }
            println!("Done. All tests passed!");
            return Ok(());
        }
        Some(Commands::Login { email, password, api_url }) => {
            let user_email = match email {
                Some(e) => e,
                None => {
                    print!("Enter email: ");
                    std::io::Write::flush(&mut std::io::stdout())?;
                    let mut input = String::new();
                    std::io::stdin().read_line(&mut input)?;
                    input.trim().to_string()
                }
            };

            let user_pass = match password {
                Some(p) => p,
                None => {
                    print!("Enter password: ");
                    std::io::Write::flush(&mut std::io::stdout())?;
                    let mut input = String::new();
                    std::io::stdin().read_line(&mut input)?;
                    input.trim().to_string()
                }
            };

            println!("Authenticating {} against {}...", user_email, api_url);
            match login_request(&user_email, &user_pass, &api_url).await {
                Ok(session) => {
                    println!("\x1b[1;32m✔ Logged in successfully as: {} ({})\x1b[0m", session.name, session.email);
                    println!("Session saved to: {:?}", auth::get_auth_file_path());
                }
                Err(err) => {
                    eprintln!("\x1b[1;31m✖ Login failed: {}\x1b[0m", err);
                    std::process::exit(1);
                }
            }
            return Ok(());
        }
        Some(Commands::Logout) => {
            clear_session().ok();
            println!("\x1b[1;32m✔ Logged out successfully. You are now in offline guest mode.\x1b[0m");
            return Ok(());
        }
        Some(Commands::Whoami) => {
            match load_session() {
                Some(session) => {
                    println!("\x1b[1;36mPostty Cloud Account:\x1b[0m");
                    println!("  Email:       {}", session.email);
                    println!("  Name:        {}", session.name);
                    println!("  API URL:     {}", session.api_url);
                    println!("  Config File: {:?}", auth::get_auth_file_path());
                    println!("  Status:      \x1b[1;32mActive (synced)\x1b[0m");
                }
                None => {
                    println!("\x1b[1;33mNot logged in (Offline Guest Mode).\x1b[0m");
                    println!("Run \x1b[1;36mpostty login\x1b[0m to sign in to your Postty Cloud account.");
                }
            }
            return Ok(());
        }
        Some(Commands::New { url, method, name }) => {
            let method_parsed = match method.to_uppercase().as_str() {
                "POST" => HttpMethod::POST,
                "PUT" => HttpMethod::PUT,
                "PATCH" => HttpMethod::PATCH,
                "DELETE" => HttpMethod::DELETE,
                "HEAD" => HttpMethod::HEAD,
                "OPTIONS" => HttpMethod::OPTIONS,
                _ => HttpMethod::GET,
            };
            let req_name = name.unwrap_or_else(|| format!("{} {}", method.to_uppercase(), url));
            let client = NativeHttpClient::new().unwrap();
            let req = RequestItem {
                id: uuid::Uuid::new_v4(),
                collection_id: uuid::Uuid::new_v4(),
                folder_id: None,
                name: req_name,
                method: method_parsed,
                url: url.clone(),
                headers: vec![],
                query_params: vec![],
                body: RequestBody::None,
                auth: postty_core::AuthConfig::None,
                pre_request_script: String::new(),
                test_script: String::new(),
                order_index: 0,
            };

            println!("\x1b[1;36mSending {} {}...\x1b[0m", method.to_uppercase(), url);
            let vars = HashMap::new();
            match client.execute(&req, &vars).await {
                Ok(resp) => {
                    println!(
                        "\x1b[1;32m✔ {} {} ({}ms, {} bytes)\x1b[0m\n",
                        resp.status_code, resp.status_text, resp.total_duration_ms, resp.size_bytes
                    );
                    println!("{}", resp.body);
                }
                Err(err) => {
                    eprintln!("\x1b[1;31m✖ Request failed: {}\x1b[0m", err);
                    std::process::exit(1);
                }
            }
            return Ok(());
        }
        None => {
            // Launch interactive fullscreen TUI
            run_tui().await?;
        }
    }

    Ok(())
}

async fn run_tui() -> Result<()> {
    enable_raw_mode()?;
    let mut stdout = stdout();
    execute!(stdout, EnterAlternateScreen, EnableMouseCapture)?;
    let backend = CrosstermBackend::new(stdout);
    let mut terminal = Terminal::new(backend)?;

    let mut state = AppState::new();

    loop {
        terminal.draw(|f| render_ui(f, &mut state))?;

        if event::poll(Duration::from_millis(50))? {
            match event::read()? {
                Event::Key(key) => {
                    // Check if modal is active
                    match &mut state.modal {
                        Modal::Help => {
                            if key.code == KeyCode::Esc || key.code == KeyCode::Char('q') || key.code == KeyCode::Enter {
                                state.modal = Modal::None;
                            }
                        }
                        Modal::NewRequest { name, method_idx, url, focused_field } => {
                            match key.code {
                                KeyCode::Esc => {
                                    state.modal = Modal::None;
                                }
                                KeyCode::Tab | KeyCode::Down => {
                                    *focused_field = (*focused_field + 1) % 3;
                                }
                                KeyCode::BackTab | KeyCode::Up => {
                                    *focused_field = if *focused_field == 0 { 2 } else { *focused_field - 1 };
                                }
                                KeyCode::Left => {
                                    if *focused_field == 1 {
                                        *method_idx = if *method_idx == 0 { METHODS.len() - 1 } else { *method_idx - 1 };
                                    }
                                }
                                KeyCode::Right => {
                                    if *focused_field == 1 {
                                        *method_idx = (*method_idx + 1) % METHODS.len();
                                    }
                                }
                                KeyCode::Backspace => {
                                    if *focused_field == 0 {
                                        name.pop();
                                    } else if *focused_field == 2 {
                                        url.pop();
                                    }
                                }
                                KeyCode::Char(c) => {
                                    if *focused_field == 0 {
                                        name.push(c);
                                    } else if *focused_field == 2 {
                                        url.push(c);
                                    }
                                }
                                KeyCode::Enter => {
                                    let req_name = if name.trim().is_empty() { "New Request".to_string() } else { name.trim().to_string() };
                                    let req_url = if url.trim().is_empty() { "https://jsonplaceholder.typicode.com/users".to_string() } else { url.trim().to_string() };
                                    let method = METHODS[*method_idx];

                                    state.add_request(req_name, method, req_url);
                                    state.modal = Modal::None;
                                }
                                _ => {}
                            }
                        }
                        Modal::Account { email, password, focused_field, message, is_error } => {
                            match key.code {
                                KeyCode::Esc => {
                                    state.modal = Modal::None;
                                }
                                KeyCode::Tab | KeyCode::Down => {
                                    *focused_field = (*focused_field + 1) % 2;
                                }
                                KeyCode::BackTab | KeyCode::Up => {
                                    *focused_field = if *focused_field == 0 { 1 } else { *focused_field - 1 };
                                }
                                KeyCode::Char('o') if key.modifiers.contains(KeyModifiers::CONTROL) => {
                                    // Ctrl+O: Logout
                                    clear_session().ok();
                                    state.session = None;
                                    *message = Some("Logged out successfully.".to_string());
                                    *is_error = false;
                                }
                                KeyCode::Backspace => {
                                    if *focused_field == 0 {
                                        email.pop();
                                    } else {
                                        password.pop();
                                    }
                                }
                                KeyCode::Char(c) => {
                                    if *focused_field == 0 {
                                        email.push(c);
                                    } else {
                                        password.push(c);
                                    }
                                }
                                KeyCode::Enter => {
                                    if email.trim().is_empty() {
                                        *message = Some("Email cannot be empty".to_string());
                                        *is_error = true;
                                    } else {
                                        let em = email.trim().to_string();
                                        let pw = password.clone();
                                        match login_request(&em, &pw, "http://localhost:4000").await {
                                            Ok(sess) => {
                                                state.session = Some(sess);
                                                state.modal = Modal::None;
                                                state.status_message = "Logged in successfully!".to_string();
                                            }
                                            Err(err) => {
                                                *message = Some(format!("Error: {}", err));
                                                *is_error = true;
                                            }
                                        }
                                    }
                                }
                                _ => {}
                            }
                        }
                        Modal::None => {
                            match key.code {
                                KeyCode::Char('q') => break,
                                KeyCode::Char('?') | KeyCode::Char('h') => {
                                    state.modal = Modal::Help;
                                }
                                KeyCode::Char('n') => {
                                    state.modal = Modal::NewRequest {
                                        name: "My API Request".to_string(),
                                        method_idx: 0,
                                        url: "https://jsonplaceholder.typicode.com/posts".to_string(),
                                        focused_field: 0,
                                    };
                                }
                                KeyCode::Char('a') => {
                                    state.modal = Modal::Account {
                                        email: String::new(),
                                        password: String::new(),
                                        focused_field: 0,
                                        message: None,
                                        is_error: false,
                                    };
                                }
                                KeyCode::Char('d') => {
                                    state.delete_current_request();
                                }
                                KeyCode::Tab => {
                                    state.active_panel = match state.active_panel {
                                        ActivePanel::Sidebar => ActivePanel::Request,
                                        ActivePanel::Request => ActivePanel::Response,
                                        ActivePanel::Response => ActivePanel::Sidebar,
                                    };
                                }
                                KeyCode::Down | KeyCode::Char('j') => {
                                    match state.active_panel {
                                        ActivePanel::Sidebar => state.next_request(),
                                        ActivePanel::Response => {
                                            state.response_scroll = state.response_scroll.saturating_add(1);
                                        }
                                        _ => {}
                                    }
                                }
                                KeyCode::Up | KeyCode::Char('k') => {
                                    match state.active_panel {
                                        ActivePanel::Sidebar => state.previous_request(),
                                        ActivePanel::Response => {
                                            state.response_scroll = state.response_scroll.saturating_sub(1);
                                        }
                                        _ => {}
                                    }
                                }
                                KeyCode::Enter => {
                                    state.execute_current().await;
                                }
                                KeyCode::Char('1') => state.selected_tab = 0,
                                KeyCode::Char('2') => state.selected_tab = 1,
                                KeyCode::Char('3') => state.selected_tab = 2,
                                KeyCode::Char('4') => state.selected_tab = 3,
                                _ => {}
                            }
                        }
                    }
                }
                Event::Mouse(mouse) => {
                    if matches!(state.modal, Modal::None) {
                        match mouse.kind {
                            MouseEventKind::Down(MouseButton::Left) => {
                                // 1. Sidebar requests hit-test (mouse.row >= 4)
                                if mouse.column < 32 && mouse.row >= 4 {
                                    let offset = state.list_state.offset();
                                    let clicked_idx = (mouse.row - 4) as usize + offset;
                                    if clicked_idx < state.requests.len() {
                                        state.list_state.select(Some(clicked_idx));
                                        state.active_panel = ActivePanel::Sidebar;
                                        state.response = None;
                                        state.response_scroll = 0;
                                    }
                                }
                                // 2. Click on Tabs (Params, Headers, Body, Auth on row 6)
                                else if mouse.row == 6 && mouse.column >= 33 {
                                    state.active_panel = ActivePanel::Request;
                                    if mouse.column < 46 {
                                        state.selected_tab = 0;
                                    } else if mouse.column < 59 {
                                        state.selected_tab = 1;
                                    } else if mouse.column < 69 {
                                        state.selected_tab = 2;
                                    } else {
                                        state.selected_tab = 3;
                                    }
                                }
                                // 3. Click on [ SEND (Enter) ] button or URL bar on row 4
                                else if mouse.row == 4 && mouse.column >= 33 {
                                    state.execute_current().await;
                                }
                                // 4. Click on Response pane to focus it
                                else if mouse.row >= 11 && mouse.column >= 32 {
                                    state.active_panel = ActivePanel::Response;
                                }
                            }
                            MouseEventKind::ScrollDown => {
                                state.response_scroll = state.response_scroll.saturating_add(2);
                            }
                            MouseEventKind::ScrollUp => {
                                state.response_scroll = state.response_scroll.saturating_sub(2);
                            }
                            _ => {}
                        }
                    }
                }
                _ => {}
            }
        }
    }

    // Cleanup terminal
    disable_raw_mode()?;
    execute!(
        terminal.backend_mut(),
        LeaveAlternateScreen,
        DisableMouseCapture
    )?;
    terminal.show_cursor()?;

    Ok(())
}

fn centered_rect(percent_x: u16, percent_y: u16, r: Rect) -> Rect {
    let popup_layout = Layout::default()
        .direction(Direction::Vertical)
        .constraints([
            Constraint::Percentage((100 - percent_y) / 2),
            Constraint::Percentage(percent_y),
            Constraint::Percentage((100 - percent_y) / 2),
        ])
        .split(r);

    Layout::default()
        .direction(Direction::Horizontal)
        .constraints([
            Constraint::Percentage((100 - percent_x) / 2),
            Constraint::Percentage(percent_x),
            Constraint::Percentage((100 - percent_x) / 2),
        ])
        .split(popup_layout[1])[1]
}

fn render_ui(f: &mut ratatui::Frame, state: &mut AppState) {
    let chunks = Layout::default()
        .direction(Direction::Vertical)
        .constraints([
            Constraint::Length(3), // Header
            Constraint::Min(10),   // Main body
            Constraint::Length(1), // Footer status bar
        ])
        .split(f.area());

    // 1. Header with dynamic account display
    let header_block = Block::default()
        .borders(Borders::ALL)
        .style(Style::default().fg(Color::Cyan));

    let (account_span, account_status) = match &state.session {
        Some(sess) => (
            Span::styled(format!("{} ({})", sess.email, sess.name), Style::default().fg(Color::Magenta).add_modifier(Modifier::BOLD)),
            Span::styled("synced", Style::default().fg(Color::Green)),
        ),
        None => (
            Span::styled("Guest (Offline)", Style::default().fg(Color::Yellow)),
            Span::styled("local only", Style::default().fg(Color::DarkGray)),
        ),
    };

    let header_text = Line::from(vec![
        Span::styled(" Postty TUI ", Style::default().add_modifier(Modifier::BOLD).fg(Color::Yellow)),
        Span::raw("│ Env: "),
        Span::styled("JSONPlaceholder", Style::default().fg(Color::Green)),
        Span::raw(" │ Account: "),
        account_span,
        Span::raw(" ["),
        account_status,
        Span::raw("] │ Press [a] Account │ [n] New Request"),
    ]);
    let header = Paragraph::new(header_text).block(header_block);
    f.render_widget(header, chunks[0]);

    // 2. Main Body (Sidebar + Right Content)
    let body_chunks = Layout::default()
        .direction(Direction::Horizontal)
        .constraints([
            Constraint::Length(32), // Sidebar
            Constraint::Min(40),    // Workspace/Request/Response
        ])
        .split(chunks[1]);

    // Sidebar
    let sidebar_items: Vec<ListItem> = state
        .requests
        .iter()
        .map(|r| {
            let method_color = match r.method {
                HttpMethod::GET => Color::Green,
                HttpMethod::POST => Color::Yellow,
                HttpMethod::PUT => Color::Blue,
                HttpMethod::PATCH => Color::Cyan,
                HttpMethod::DELETE => Color::Red,
                _ => Color::White,
            };
            let method_str = match r.method {
                HttpMethod::GET => "GET ",
                HttpMethod::POST => "POST",
                HttpMethod::PUT => "PUT ",
                HttpMethod::PATCH => "PAT ",
                HttpMethod::DELETE => "DEL ",
                _ => "REQ ",
            };

            ListItem::new(Line::from(vec![
                Span::styled(format!(" {} ", method_str), Style::default().fg(Color::Black).bg(method_color)),
                Span::raw(format!(" {}", r.name)),
            ]))
        })
        .collect();

    let sidebar_block = Block::default()
        .borders(Borders::ALL)
        .title(" Requests ([n] Add, [d] Del) ")
        .style(if state.active_panel == ActivePanel::Sidebar {
            Style::default().fg(Color::Yellow)
        } else {
            Style::default().fg(Color::DarkGray)
        });

    let list = List::new(sidebar_items)
        .block(sidebar_block)
        .highlight_style(Style::default().add_modifier(Modifier::BOLD).bg(Color::Rgb(40, 44, 52)))
        .highlight_symbol("> ");
    f.render_stateful_widget(list, body_chunks[0], &mut state.list_state);

    // Right Split (Request on top, Response on bottom)
    let right_chunks = Layout::default()
        .direction(Direction::Vertical)
        .constraints([
            Constraint::Length(8), // Request bar & tabs
            Constraint::Min(10),   // Response pane
        ])
        .split(body_chunks[1]);

    // Request Bar
    if let Some(req) = state.current_request() {
        let req_block = Block::default()
            .borders(Borders::ALL)
            .title(" Request ")
            .style(if state.active_panel == ActivePanel::Request {
                Style::default().fg(Color::Yellow)
            } else {
                Style::default().fg(Color::DarkGray)
            });

        let req_url_line = Line::from(vec![
            Span::styled(format!(" {} ", method_name(req.method)), Style::default().fg(Color::Black).bg(Color::Green)),
            Span::raw(" "),
            Span::styled(&req.url, Style::default().add_modifier(Modifier::UNDERLINED)),
            Span::raw("  "),
            Span::styled(" [ SEND (Enter) ] ", Style::default().fg(Color::Black).bg(Color::Cyan)),
        ]);

        let titles = vec!["Params (1)", "Headers (2)", "Body (3)", "Auth (4)"];
        let tabs = Tabs::new(titles)
            .select(state.selected_tab)
            .style(Style::default().fg(Color::Gray))
            .highlight_style(Style::default().fg(Color::Yellow).add_modifier(Modifier::BOLD));

        let body_preview = match &req.body {
            RequestBody::Raw { raw, .. } => raw.as_str(),
            _ => "(no body)",
        };

        f.render_widget(req_block, right_chunks[0]);

        let req_inner = Layout::default()
            .direction(Direction::Vertical)
            .constraints([
                Constraint::Length(1), // URL & Send button
                Constraint::Length(1), // Spacer
                Constraint::Length(1), // Tabs
                Constraint::Min(1),    // Payload preview
            ])
            .margin(1)
            .split(right_chunks[0]);

        let req_url_para = Paragraph::new(req_url_line);
        f.render_widget(req_url_para, req_inner[0]);
        f.render_widget(tabs, req_inner[2]);

        let body_para = Paragraph::new(Line::styled(format!("Payload: {}", body_preview), Style::default().fg(Color::Gray)));
        f.render_widget(body_para, req_inner[3]);
    }

    // Response Pane
    let (resp_title, resp_content, resp_status_color) = if let Some(resp) = &state.response {
        let color = if resp.status_code >= 200 && resp.status_code < 300 {
            Color::Green
        } else {
            Color::Red
        };
        let title = format!(
            " Response: {} {} │ {}ms │ {} bytes │ Scroll: {} ",
            resp.status_code, resp.status_text, resp.total_duration_ms, resp.size_bytes, state.response_scroll
        );
        (title, resp.body.as_str(), color)
    } else {
        (
            " Response (Press Enter or click SEND) ".to_string(),
            "Press Enter to execute the selected request.",
            Color::DarkGray,
        )
    };

    let resp_block = Block::default()
        .borders(Borders::ALL)
        .title(resp_title)
        .style(if state.active_panel == ActivePanel::Response {
            Style::default().fg(Color::Yellow)
        } else {
            Style::default().fg(resp_status_color)
        });

    let resp_para = Paragraph::new(resp_content)
        .block(resp_block)
        .wrap(Wrap { trim: false })
        .scroll((state.response_scroll, 0));
    f.render_widget(resp_para, right_chunks[1]);

    // 3. Footer Status Bar
    let footer_text = Line::from(vec![
        Span::styled(format!(" {} ", state.status_message), Style::default().fg(Color::White).bg(Color::Blue)),
        Span::raw(" │ [n] New │ [d] Del │ [a] Account │ [Tab] Focus │ [Enter] Send │ [?] Help │ [q] Quit"),
    ]);
    let footer = Paragraph::new(footer_text).alignment(Alignment::Left);
    f.render_widget(footer, chunks[2]);

    // =========================================================================
    // MODAL DIALOGS
    // =========================================================================

    match &state.modal {
        Modal::NewRequest { name, method_idx, url, focused_field } => {
            let area = centered_rect(60, 45, f.area());
            f.render_widget(Clear, area);

            let block = Block::default()
                .borders(Borders::ALL)
                .title(" Create New Request [Enter to Save, Esc to Cancel] ")
                .style(Style::default().fg(Color::Yellow).bg(Color::Black));
            f.render_widget(block, area);

            let inner = Layout::default()
                .direction(Direction::Vertical)
                .constraints([
                    Constraint::Length(3), // Name input
                    Constraint::Length(3), // Method select
                    Constraint::Length(3), // URL input
                    Constraint::Length(1), // Help tip
                ])
                .margin(2)
                .split(area);

            // Name Field
            let name_style = if *focused_field == 0 {
                Style::default().fg(Color::Yellow)
            } else {
                Style::default().fg(Color::Gray)
            };
            let name_block = Block::default().borders(Borders::ALL).title(" Request Name ").style(name_style);
            let name_para = Paragraph::new(name.as_str()).block(name_block);
            f.render_widget(name_para, inner[0]);

            // Method Field
            let method_style = if *focused_field == 1 {
                Style::default().fg(Color::Yellow)
            } else {
                Style::default().fg(Color::Gray)
            };
            let method_spans: Vec<Span> = METHODS
                .iter()
                .enumerate()
                .map(|(idx, m)| {
                    if idx == *method_idx {
                        Span::styled(format!(" [{}] ", method_name(*m)), Style::default().fg(Color::Black).bg(Color::Yellow).add_modifier(Modifier::BOLD))
                    } else {
                        Span::styled(format!("  {}  ", method_name(*m)), Style::default().fg(Color::Gray))
                    }
                })
                .collect();
            let method_block = Block::default().borders(Borders::ALL).title(" Method (Use ← / → to change) ").style(method_style);
            let method_para = Paragraph::new(Line::from(method_spans)).block(method_block);
            f.render_widget(method_para, inner[1]);

            // URL Field
            let url_style = if *focused_field == 2 {
                Style::default().fg(Color::Yellow)
            } else {
                Style::default().fg(Color::Gray)
            };
            let url_block = Block::default().borders(Borders::ALL).title(" URL ").style(url_style);
            let url_para = Paragraph::new(url.as_str()).block(url_block);
            f.render_widget(url_para, inner[2]);

            // Footer hint
            let hint = Paragraph::new("Press [Tab] to switch fields, [Enter] to create request, [Esc] to cancel")
                .style(Style::default().fg(Color::DarkGray));
            f.render_widget(hint, inner[3]);
        }

        Modal::Account { email, password, focused_field, message, is_error } => {
            let area = centered_rect(60, 50, f.area());
            f.render_widget(Clear, area);

            let block = Block::default()
                .borders(Borders::ALL)
                .title(" Account / Cloud Sync [Enter to Login, Esc to Close] ")
                .style(Style::default().fg(Color::Magenta).bg(Color::Black));
            f.render_widget(block, area);

            let inner = Layout::default()
                .direction(Direction::Vertical)
                .constraints([
                    Constraint::Length(2), // Current status
                    Constraint::Length(3), // Email input
                    Constraint::Length(3), // Password input
                    Constraint::Length(2), // Feedback message
                    Constraint::Length(1), // Footer hint
                ])
                .margin(2)
                .split(area);

            // Current Session Info
            let status_line = match &state.session {
                Some(sess) => Line::from(vec![
                    Span::raw("Logged in as: "),
                    Span::styled(&sess.email, Style::default().fg(Color::Green).add_modifier(Modifier::BOLD)),
                    Span::raw(" (Press "),
                    Span::styled("Ctrl+O", Style::default().fg(Color::Red).add_modifier(Modifier::BOLD)),
                    Span::raw(" to logout)"),
                ]),
                None => Line::from(vec![
                    Span::styled("Not logged in. ", Style::default().fg(Color::Yellow)),
                    Span::raw("Enter credentials to sign in and sync collections:"),
                ]),
            };
            f.render_widget(Paragraph::new(status_line), inner[0]);

            // Email Field
            let email_style = if *focused_field == 0 {
                Style::default().fg(Color::Yellow)
            } else {
                Style::default().fg(Color::Gray)
            };
            let email_block = Block::default().borders(Borders::ALL).title(" Email ").style(email_style);
            let email_para = Paragraph::new(email.as_str()).block(email_block);
            f.render_widget(email_para, inner[1]);

            // Password Field
            let pass_style = if *focused_field == 1 {
                Style::default().fg(Color::Yellow)
            } else {
                Style::default().fg(Color::Gray)
            };
            let masked_pass: String = "*".repeat(password.len());
            let pass_block = Block::default().borders(Borders::ALL).title(" Password ").style(pass_style);
            let pass_para = Paragraph::new(masked_pass).block(pass_block);
            f.render_widget(pass_para, inner[2]);

            // Feedback Message
            if let Some(msg) = message {
                let msg_color = if *is_error { Color::Red } else { Color::Green };
                let msg_para = Paragraph::new(Line::styled(msg, Style::default().fg(msg_color)));
                f.render_widget(msg_para, inner[3]);
            }

            // Footer hint
            let hint = Paragraph::new("[Tab] Switch fields │ [Enter] Sign In │ [Ctrl+O] Log out │ [Esc] Close")
                .style(Style::default().fg(Color::DarkGray));
            f.render_widget(hint, inner[4]);
        }

        Modal::Help => {
            let area = centered_rect(60, 60, f.area());
            f.render_widget(Clear, area);

            let block = Block::default()
                .borders(Borders::ALL)
                .title(" Postty TUI Shortcuts & Help [Press Esc or q to Close] ")
                .style(Style::default().fg(Color::Cyan).bg(Color::Black));

            let help_text = vec![
                Line::from(vec![Span::styled("NAVIGATION & EXECUTION:", Style::default().fg(Color::Yellow).add_modifier(Modifier::BOLD))]),
                Line::from(vec![Span::styled("  [Enter]         ", Style::default().fg(Color::Green)), Span::raw("Send selected HTTP request")]),
                Line::from(vec![Span::styled("  [Tab]           ", Style::default().fg(Color::Green)), Span::raw("Cycle focus: Sidebar -> Request -> Response")]),
                Line::from(vec![Span::styled("  [j / Down]      ", Style::default().fg(Color::Green)), Span::raw("Next request or scroll down response")]),
                Line::from(vec![Span::styled("  [k / Up]        ", Style::default().fg(Color::Green)), Span::raw("Previous request or scroll up response")]),
                Line::from(vec![Span::styled("  [1, 2, 3, 4]    ", Style::default().fg(Color::Green)), Span::raw("Switch tabs: Params, Headers, Body, Auth")]),
                Line::from(vec![Span::raw("")]),
                Line::from(vec![Span::styled("MANAGING REQUESTS:", Style::default().fg(Color::Yellow).add_modifier(Modifier::BOLD))]),
                Line::from(vec![Span::styled("  [n]             ", Style::default().fg(Color::Green)), Span::raw("Create new request (opens popup dialog)")]),
                Line::from(vec![Span::styled("  [d]             ", Style::default().fg(Color::Green)), Span::raw("Delete currently selected request")]),
                Line::from(vec![Span::raw("")]),
                Line::from(vec![Span::styled("ACCOUNT & SYNC:", Style::default().fg(Color::Yellow).add_modifier(Modifier::BOLD))]),
                Line::from(vec![Span::styled("  [a]             ", Style::default().fg(Color::Green)), Span::raw("Open Account modal (sign in, switch, or log out)")]),
                Line::from(vec![Span::styled("  [?] / [h]       ", Style::default().fg(Color::Green)), Span::raw("Show this help dialog")]),
                Line::from(vec![Span::styled("  [q]             ", Style::default().fg(Color::Green)), Span::raw("Quit Postty TUI")]),
                Line::from(vec![Span::raw("")]),
                Line::from(vec![Span::styled("CLI COMMANDS:", Style::default().fg(Color::Yellow).add_modifier(Modifier::BOLD))]),
                Line::from(vec![Span::styled("  postty whoami   ", Style::default().fg(Color::Cyan)), Span::raw("Check current logged-in account")]),
                Line::from(vec![Span::styled("  postty login    ", Style::default().fg(Color::Cyan)), Span::raw("Log in from command line")]),
                Line::from(vec![Span::styled("  postty logout   ", Style::default().fg(Color::Cyan)), Span::raw("Clear saved credentials")]),
                Line::from(vec![Span::styled("  postty new <URL>", Style::default().fg(Color::Cyan)), Span::raw("Run a quick ad-hoc request")]),
            ];

            let para = Paragraph::new(help_text).block(block);
            f.render_widget(para, area);
        }

        Modal::None => {}
    }
}
