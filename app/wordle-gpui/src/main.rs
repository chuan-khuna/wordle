//! The desktop game, drawn with gpui: parse the options, then open the window.

mod args;
mod commands;
mod dictionary;
mod search;
mod theme;
mod ui;

use gpui::{App, Bounds, WindowBounds, WindowOptions, prelude::*, px, size};

use args::Args;
use gpui_kit_assets::Assets;
use ui::{WordleApp, title_bar};

fn main() {
    let game = match Args::parse().and_then(|args| args.first_game()) {
        Ok(game) => game,
        Err(error) => {
            eprintln!("wordle-gpui: {error}");
            std::process::exit(2);
        }
    };

    gpui_platform::application().with_assets(Assets).run(move |cx: &mut App| {
        gpui_component::init(cx);
        ui::bind_keys(cx);
        cx.on_window_closed(|cx, _| cx.quit()).detach();

        let bounds = Bounds::centered(None, size(px(520.), px(980.)), cx);
        cx.open_window(
            WindowOptions {
                window_bounds: Some(WindowBounds::Windowed(bounds)),
                window_min_size: Some(size(px(480.), px(960.))),
                titlebar: Some(title_bar::options()),
                ..Default::default()
            },
            |window, cx| {
                cx.new(|cx| {
                    let app = WordleApp::new(game, cx);
                    window.focus(&app.focus_handle, cx);
                    app
                })
            },
        )
        .unwrap();
        cx.activate(true);
    });
}
