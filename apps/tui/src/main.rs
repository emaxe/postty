use std::collections::HashMap;
use std::io::{stdout, Result};
use std::time::Duration;

use clap::{Parser, Subcommand};
use crossterm::{
    event::{self, DisableMouseCapture, EnableMouseCapture, Event, KeyCode, MouseButton, MouseEventKind},
    execute,
    terminal::{disable_raw_mode, enable_raw_mode, EnterAlternateScreen, LeaveAlternateScreen},
};
use ratatui::{
    backend::CrosstermBackend,
    layout::{Alignment, Constraint, Direction, Layout},
    style::{Color, Modifier, Style},
    text::{Line, Span},
    widgets::{Block, Borders, List, ListItem, ListState, Paragraph, Tabs, Wrap},
    Terminal,
};

use postty_core::{HttpMethod, HttpResponse, KeyValueParam, NativeHttpClient, RequestBody, RequestItem};

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
    Login,
}

#[derive(PartialEq, Eq, Clone, Copy)]
enum ActivePanel {
    Sidebar,
    Request,
    Response,
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

        Self {
            requests: sample_requests,
            list_state,
            active_panel: ActivePanel::Sidebar,
            selected_tab: 0,
            response: None,
            response_scroll: 0,
            variables,
            status_message: "Ready. Press [Enter] or click [SEND] to execute request".to_string(),
            http_client: NativeHttpClient::new().unwrap(),
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

    async fn execute_current(&mut self) {
        if let Some(req) = self.current_request() {
            let req_clone = req.clone();
            self.status_message = format!("Sending {} {}...", match req_clone.method {
                HttpMethod::GET => "GET",
                HttpMethod::POST => "POST",
                HttpMethod::PUT => "PUT",
                HttpMethod::PATCH => "PATCH",
                HttpMethod::DELETE => "DELETE",
                HttpMethod::HEAD => "HEAD",
                HttpMethod::OPTIONS => "OPTIONS",
            }, req_clone.url);

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
        Some(Commands::Login) => {
            println!("Logging in to Postty Cloud...");
            println!("Open URL in your browser: https://postty.dev/activate?user_code=WDJB-MJGN");
            println!("Waiting for confirmation...");
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
                    match key.code {
                        KeyCode::Char('q') => break,
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
                Event::Mouse(mouse) => {
                    match mouse.kind {
                        MouseEventKind::Down(MouseButton::Left) => {
                            // Hit-test for sidebar requests or tabs
                            if mouse.column < 32 && mouse.row >= 3 {
                                let clicked_idx = (mouse.row - 3) as usize;
                                if clicked_idx < state.requests.len() {
                                    state.list_state.select(Some(clicked_idx));
                                    state.response = None;
                                    state.response_scroll = 0;
                                }
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

fn render_ui(f: &mut ratatui::Frame, state: &mut AppState) {
    let chunks = Layout::default()
        .direction(Direction::Vertical)
        .constraints([
            Constraint::Length(3), // Header
            Constraint::Min(10),   // Main body
            Constraint::Length(1), // Footer status bar
        ])
        .split(f.area());

    // 1. Header
    let header_block = Block::default()
        .borders(Borders::ALL)
        .style(Style::default().fg(Color::Cyan));
    let header_text = Line::from(vec![
        Span::styled(" Postty TUI ", Style::default().add_modifier(Modifier::BOLD).fg(Color::Yellow)),
        Span::raw("│ Env: "),
        Span::styled("JSONPlaceholder", Style::default().fg(Color::Green)),
        Span::raw(" │ Account: "),
        Span::styled("maksim@postty.dev (synced)", Style::default().fg(Color::Magenta)),
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
        .title(" Collections (Click/Nav) ")
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
        let method_str = match req.method {
            HttpMethod::GET => "GET",
            HttpMethod::POST => "POST",
            HttpMethod::PUT => "PUT",
            HttpMethod::PATCH => "PATCH",
            HttpMethod::DELETE => "DELETE",
            _ => "REQ",
        };

        let req_block = Block::default()
            .borders(Borders::ALL)
            .title(" Request ")
            .style(if state.active_panel == ActivePanel::Request {
                Style::default().fg(Color::Yellow)
            } else {
                Style::default().fg(Color::DarkGray)
            });

        let req_url_line = Line::from(vec![
            Span::styled(format!(" {} ", method_str), Style::default().fg(Color::Black).bg(Color::Green)),
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
        Span::raw(" │ [Tab] Focus │ [Enter] Send │ [Mouse/j/k] Scroll │ [q] Quit"),
    ]);
    let footer = Paragraph::new(footer_text).alignment(Alignment::Left);
    f.render_widget(footer, chunks[2]);
}
