import React from "react";
import "./App.css";
import Player from "./Player"
import ColorPicker from '@radial-color-picker/react-color-picker';
import '@radial-color-picker/react-color-picker/dist/style.css';
import axios from "axios";
import hslToHex from "hsl-to-hex";
require('hsl-to-hex');

const PLAYER_NAMES = [ "Adam", "Dylan", "Callum", "James", "Hayley", "Koni", "Beth", "Leah", "Emily", "Sam", "Lauren", "Dan" ].sort(function(a, b){
    if (a < b) { return -1; }if (a > b) { return 1; } return 0; });

const STATES = {
    SETUP: 0,       // Asigning players to buzzers, choosing colours, etc
    DEMO: 1,        // Let players try out the remotes
    SELECTION: 2,   // On the category board
    WAITING: 3,     // Question shown but players cant buzz yet
    ARMED: 4,       // Players can buzz in
    BUZZED: 5,      // A player has buzzed in
    ANSWERED: 6,    // The question has been answered correctly, show answer
    TIEBREAK: 7,    // Extra question for tiebreaking
    GAMEOVER: 8     // All questions are complete, show final scores
}

const WINDOWS = {
    MENU: "Main Menu",
    PLAYERS: "Players",
    BIND_PLAYER: "Bind Player",
    EDIT_PLAYER: "Edit Player",
    CONTROL_BOARD: "Control Board",
    DEMO: "Demo Mode",
    GAME_STATE: "Game State",
    PICK_CATEGORY: "Select Category",
    PICK_QUESTION: "Select Question",
    QUESTION: "Question",
    DEBUG: "Debug Options",
    LOG: "Event Log"
}



class App extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            window: WINDOWS.MENU,
            gameState: { players: [] },
            color: { hue: 90, saturation: 100, luminosity: 50, alpha: 1 }
        };

        this.serverAddress = "http://192.168.0.128:8000/";
        this.server = axios.create({
            baseURL: this.serverAddress,
            timeout: 1000
        })

        this.colours = [
            "#5bc0ebff",
            "#c3423fff",
            "#eae151ff",
            "#404e4dff",
            "#558564ff",
            "#ff88dcff",
            "#6622ccff"
        ]
    }
    
    componentDidMount() {
        this.fetchData();
    }

    componentWillUnmount() {
        if (this.fetchTimeout) {
            clearTimeout(this.fetchTimeout);
        }
    }

    fetchData = () => {
        this.server.get('board-data')
            .then(res => {
                console.log(res);
                this.setState({ board: res.data }, () => {
                    this.fetchState();
                });
            });
    }

    fetchState = () => {
        this.server.get('game-state')
            .then(res => {
                console.log(res);

                this.setState({ gameState: res.data }, () => {
                    console.log(this.state.gameState.players[0]);

                    // if (this.state.gameState.state >= STATES.WAITING && this.state.gameState.state <= STATES.ANSWERED) {
                    //     console.log("Question")
                    //     this.setState({
                    //         showQuestion: true,showGrid: false });
                    // } else {
                    //     this.setState({
                    //         showQuestion: false,
                    //         showGrid: true
                    //     });
                    // }


                });
                this.fetchTimeout = setTimeout(this.fetchState, 1000)

            });
    }


    changeWindow(window) {
        this.setState({ window: window });
    }

    editPlayer(player) {
        this.fetchState();
        this.setState({ window: WINDOWS.EDIT_PLAYER, editingPlayer: player });
    }

    modifyPlayerPoints(sign) {
        let player = this.state.gameState.players.find(p => p.buzzer === this.state.editingPlayer);
        let amount = document.querySelector('input[name="increment"]:checked');
        if (!player) {
            console.warn("Can't modify points with no player selected!");
            return;
        }
        if (!amount) {
            console.warn("Can't modify points with no increment selected!");
        }
        this.server.post('modify-points', {
            name: player.name,
            index: player.buzzer,
            points: amount.value * sign
        }).then(() => {
            this.fetchState();
        });
    }

    editPanel() {
        let player = this.state.gameState.players.find(p => p.buzzer === this.state.editingPlayer);
        if (!player) { return; }

        return (
            <div className="edit-player" style={{ display: this.state.window === WINDOWS.EDIT_PLAYER ? "block" : "none" }}>
                <h2 id="edit-title">{player.name}</h2>
                <h3>{player.points} points</h3>

                <div className="point-range">
                    <input type="radio" id="inc1" name="increment" value="1" /><label for="inc1">1</label>
                    <input type="radio" id="inc10" name="increment" value="10"/><label for="inc10">10</label>
                    <input type="radio" id="inc100" name="increment" value="100" defaultChecked/><label for="inc100">100</label>
                    <input type="radio" id="inc1000" name="increment" value="1000"/><label for="inc1000">1000</label>
                </div>

                <button onClick={() => this.modifyPlayerPoints(-1)} className="double-button">-</button>
                <button onClick={() => this.modifyPlayerPoints(1)} className="double-button">+</button>

                <button onClick={() => this.changeWindow(WINDOWS.MENU)}>Done</button>

            </div>
        )
    }

    colourPickerChange(hue) {
        this.setState({ color: {
            hue: hue,
            saturation: this.state.color.saturation,
            luminosity: this.state.color.luminosity,
            alpha: this.state.color.alpha
        }})
    };

    bindPlayer() {
        let newName = document.getElementById("bind-name").value;
        let hex = hslToHex(this.state.color.hue, this.state.color.saturation, this.state.color.luminosity);

        this.server.post('bind-player', {
            name: newName,
            colour: hex.slice(-6)
        });
    }

    bindPanel() {
        return (
            <div className="bind-player" style={{ display: this.state.window === WINDOWS.BIND_PLAYER ? "block" : "none" }}>
                <input id="bind-name" type="text" list="player-name-options" />
                <datalist id="player-name-options">
                    {PLAYER_NAMES.map(p => <option>{p}</option>)}
                </datalist>

                <div id="colour-picker">
                    <ColorPicker {...this.state.color} onInput={this.colourPickerChange.bind(this)} />
                </div>

                <button onClick={this.bindPlayer.bind(this)} type="button">Bind</button>
            </div>
        )
    }

    pickCategory(category) {
        this.setState({
            selectedCategory: category
        });
        this.changeWindow(WINDOWS.PICK_QUESTION);
    }

    pickCategoryPanel() {
        if (!this.state.board) { return; }
        console.log(this.state.board)
        return (
            <div className="pick-category" style={{ display: this.state.window === WINDOWS.PICK_CATEGORY ? "block" : "none" }}>
                {this.state.board.map(category => <button onClick={() => this.pickCategory(category)} type="button">{category.title}</button>)}
            </div>
        )
    }

    pickQuestion(question) {
        this.server.post('select-question', {
            category: this.state.selectedCategory.title,
            question: question.title
        }).then(() => {
            this.changeWindow(WINDOWS.QUESTION);
        });
    }

    pickQuestionPanel() {
        if (!this.state.selectedCategory) { return; }
        console.log(this.state.selectedCategory)
        return (
            <div className="pick-question" style={{ display: this.state.window === WINDOWS.PICK_QUESTION ? "block" : "none" }}>
                {this.state.selectedCategory.questions.map(question => <button onClick={() => this.pickQuestion(question)} type="button" disabled={question.complete}>{question.reward}</button>)}
            </div>
        )
    }
    
    viewPlayersPanel() {
        let players = this.state.gameState.players.map(p => <Player callback={this.editPlayer.bind(this)}
                                                                    name={p.name}
                                                                    index={p.buzzer}
                                                                    colour={p.colour}>
                                                            </Player>)
        return (
            <div className="players" style={{ display: this.state.window === WINDOWS.PLAYERS ? "block" : "none" }}>
                {players}
            </div>
        )
    }

    playerAnswer(state) {
        this.server.post('answer-response', {
            correct: state
        });
    }

    activateBuzzers() {
        this.server.post('activate-buzzers');
    }

    showAnswer() {
        this.server.post('show-answer');
    }

    closeQuestion() {
        this.server.post('select-question');
        this.state.window = WINDOWS.PICK_CATEGORY;
    }

    readQuestionPanel() {
        if (!this.state.gameState || !this.state.gameState.activeQuestion) { return; }
        
        let buzzedPlayer = "";
        if (this.state.gameState.buzzedPlayer) {
            buzzedPlayer = this.state.gameState.buzzedPlayer.name;
        }

        let startText = "Buzzers"
        if (this.state.gameState.activeQuestion.type === "Video" || this.state.gameState.activeQuestion.type === "Audio") {
            startText = "Start"
        }

        return (
            <div className="question" style={{ display: this.state.window === WINDOWS.QUESTION ? "block" : "none" }}>
                <p className="question-details">{this.state.gameState.activeCategory.title} for {this.state.gameState.activeQuestion.reward}</p>
                <p className="question-details" id="question-text">{this.state.gameState.activeQuestion.title}</p>
                <p className="question-details">Answer: {this.state.gameState.activeQuestion.answer}</p>
                {/* <p className="question-details">Reward: {this.state.gameState.activeQuestion.reward}</p> */}

                <hr></hr>
                <h4>Player Controls</h4>
                <div id="player-controls">
                    <p id="buzzed-player">{buzzedPlayer}</p>
                    <button onClick={() => this.playerAnswer(true)} type="button" className="question-buttons double-button validate-buttons" id="correct-button" disabled={this.state.gameState.state !== STATES.BUZZED}>✔</button>
                    <button onClick={() => this.playerAnswer(false)} type="button" className="question-buttons double-button validate-buttons" id="incorrect-button" disabled={this.state.gameState.state !== STATES.BUZZED}>✘</button>
                </div>

                <hr></hr>
                <h4>Game Controls</h4>
                <div id="display-controls">
                    <button onClick={this.activateBuzzers.bind(this)} type="button" className="question-buttons double-button" id="start-button" disabled={this.state.gameState.state !== STATES.WAITING}>{startText}</button>
                    <button onClick={this.showAnswer.bind(this)} type="button" className="question-buttons double-button" id="answer-button" disabled={this.state.gameState.state < STATES.ARMED || this.state.gameState.state === STATES.ANSWERED}>Show Answer</button>
                </div>

                <hr></hr>
                <button onClick={this.closeQuestion.bind(this)} type="button" id="question-done-button">Done</button>
            </div>
        )
    }

    pickQuestionButton() {
        if (!this.state.gameState || !this.state.gameState.activeQuestion) {
            this.changeWindow(WINDOWS.PICK_CATEGORY);
        } else {
            this.changeWindow(WINDOWS.QUESTION);
        }
    }

    openLogWindow() {
        this.server.get('event-log')
        .then(res => {
            this.setState({ log: res.data });
            this.changeWindow(WINDOWS.LOG);
        });
    }

    logPanel() {
        if (!this.state.log || !this.window === WINDOWS.LOG) { return; }
        // var textarea = document.getElementById('textarea_id');
        // textarea.scrollTop = textarea.scrollHeight;
        return (
            <div className="log-panel" style={{ display: this.state.window === WINDOWS.LOG ? "block" : "none" }}>
                <textarea className="event-log" readOnly={true}>
                    {this.state.log.join("\n")}
                </textarea>
            </div>
        )
    }


    render() {
        return (
            <div className="App">
                <div id="header">
                    <h1>RockCheque<span id="host-text">HOST</span></h1>
                    <button onClick={() => this.changeWindow(WINDOWS.MENU)} type="button" id="menu-button">≡</button>
                    <p id="panel-title">{this.state.window}</p>
                </div>

                <div className="main-menu" style={{ display: this.state.window === WINDOWS.MENU ? "block" : "none" }}>
                    <button onClick={() => this.pickQuestionButton()} type="button">Pick Question</button>
                    <button onClick={() => this.changeWindow(WINDOWS.PLAYERS)} type="button">View Players</button>
                    <button onClick={() => this.changeWindow(WINDOWS.BIND_PLAYER)} type="button">Bind Player</button>
                    <button onClick={() => this.openLogWindow()} type="button">Event Log</button>
                    <button onClick={() => this.changeWindow(WINDOWS.DEMO)} type="button">Demo Mode</button>
                    <button onClick={() => this.changeWindow(WINDOWS.DEBUG)} type="button">Debug</button>
                </div>

                {this.pickCategoryPanel()}
                {this.pickQuestionPanel()}
                {this.readQuestionPanel()}
                

                {this.viewPlayersPanel()}
                {this.editPanel()}
                
                {this.bindPanel()}
                
                {this.logPanel()}
                <div className="demo-panel" style={{ display: this.state.window === WINDOWS.DEMO ? "block" : "none" }}></div>
                <div className="debug" style={{ display: this.state.window === WINDOWS.DEBUG ? "block" : "none" }}>
                    <button onClick={() => this.changeWindow(WINDOWS.GAME_STATE)} type="button">Game State</button>
                    <button onClick={() => this.changeWindow(WINDOWS.CONTROL_BOARD)} type="button">Control Board</button>
                </div>
                <div className="game-state" style={{ display: this.state.window === WINDOWS.GAME_STATE ? "block" : "none" }}></div>
                <div className="control-board" style={{ display: this.state.window === WINDOWS.CONTROL_BOARD ? "block" : "none" }}></div>
                
                    




            </div>
        );
    }
}

export default App;
