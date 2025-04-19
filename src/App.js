import React from "react";
import "./App.css";
import Player from "./Player"
import ColorPicker from '@radial-color-picker/react-color-picker';
import '@radial-color-picker/react-color-picker/dist/style.css';
import axios from "axios";
import hslToHex from "hsl-to-hex";
require('hsl-to-hex');

const clcPattern = /(\x1b\[(\d{1,2})m)?([^\x1b]*)(\x1b\[(\d{1,2})m)?/
// const clcPattern = /(.*)/

const STATES_LOOKUP = [
    "SETUP",       // Asigning players to buzzers, choosing colours, etc
    "DEMO",        // Let players try out the remotes
    "SELECTION",   // On the category board
    "WAITING",     // Question shown but players cant buzz yet
    "ARMED",       // Players can buzz in
    "BUZZED",      // A player has buzzed in
    "ANSWERED",    // The question has been answered correctly, show answer
    "TIEBREAK",    // Extra question for tiebreaking
    "GAMEOVER"     // All questions are complete, show final scores
]

const clcColours = new Map([
    [30, "black"],
    [31, "darkred"],
    [32, "green"],
    [33, "darkyellow"],
    [34, "darkblue"],
    [35, "darkmagenta"],
    [36, "darkcyan"],
    [37, "gray"],
    [90, "darkgray"],
    [91, "red"],
    [92, "lime"],
    [93, "yellow"],
    [94, "blue"],
    [95, "magenta"],
    [96, "cyan"],
    [97, "white"],
    [40, "black"],
    [41, "darkred"],
    [42, "lime"],
    [43, "darkyellow"],
    [44, "darkblue"],
    [45, "darkmagenta"],
    [46, "darkcyan"],
    [47, "gray"],
    [100, "darkgray"],
    [101, "red"],
    [102, "lime"],
    [103, "yellow"],
    [104, "blue"],
    [105, "magenta"],
    [106, "cyan"],
    [107, "white"]
]);

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
    DEBUG: "Game Controls",
    LOG: "Event Log",
    EDIT_PICK_CATEGORY: "Edit Category",
    EDIT_PICK_QUESTION: "Edit Question",
    EDITING_QUESTION: "Editing Question",
    LOAD_GAME: "Load",
    SAVE_GAME: "Save"
}

class App extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            window: WINDOWS.MENU,
            gameState: { players: [], state: STATES.SETUP },
            color: { hue: 90, saturation: 100, luminosity: 50, alpha: 1 },
            serverResponding: false,
            savedGames: null
        };

        this.serverAddress = "http://10.56.120.65:8000/";
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
        this.registerHost();
        this.fetchData();
        this.fetchInterval = setInterval(this.fetchState, 1000)
    }

    componentWillUnmount() {
        // if (this.fetchTimeout) {
        //     clearTimeout(this.fetchTimeout);
        // }
        if (this.fetchInterval) {
            clearInterval(this.fetchInterval);
        }
    }

    registerHost = () => {
        this.server.post('host');
    }

    fetchData = (callback) => {
        this.server.get('board-data')
            .then(res => {
                // console.log(res);
                this.setState({ board: res.data }, () => {
                    if (callback) {
                        callback();
                    }
                    // this.fetchState();
                });
            });
    }

    fetchState = () => {
        this.server.get('game-state')
            .then(res => {
                // console.log(res);
                this.setState({ gameState: res.data }, () => {
                    // console.log(this.state.gameState.players[0]);

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

            });

        if (this.state.window === WINDOWS.BIND_PLAYER) {
            this.server.get('event-log')
            .then(res => {
                this.setState({ log: res.data });
            });
        }
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
            saturation: 100,
            luminosity: 50,
            alpha: 1
        }})
        console.log(this.state);
    };

    bindPlayer() {
        let newName = document.getElementById("bind-name").value;
        let hex = hslToHex(this.state.color.hue, this.state.color.saturation, this.state.color.luminosity);

        this.server.post('bind-player', {
            name: newName,
            colour: hex.slice(-6)
        });
    }

    clearBindSettings() {
        document.getElementById("bind-name").value = "";
    }

    setColourWhite() {
        this.setState({ color: {
            hue: this.state.color.hue,
            saturation: 0,
            luminosity: 100,
            alpha: 1
        }})
    }

    bindPanel() {
        return (
            <div className="bind-player" style={{ display: this.state.window === WINDOWS.BIND_PLAYER ? "block" : "none" }}>
                <input id="bind-name" type="text" list="player-name-options" />
                <datalist id="player-name-options">
                    {PLAYER_NAMES.map(p => <option>{p}</option>)}
                </datalist>

                <div id="colour-picker">
                    <ColorPicker variant="persistent" {...this.state.color} onInput={this.colourPickerChange.bind(this)} />
                </div>
                <div>
                    <button className="colour-button question-text-button" onClick={this.setColourWhite.bind(this)}>White</button>
                </div>

                {this.genericLogPanel(WINDOWS.BIND_PLAYER, "8vh")}

                <button className="double-button question-text-button" onClick={this.bindPlayer.bind(this)} type="button">Bind</button>
                <button className="double-button question-text-button" onClick={this.clearBindSettings.bind(this)} type="button">Clear</button>
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
                                                            </Player>);
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

    rewindMedia() {
        this.server.post('rewind-media');
    }

    playMedia() {
        this.server.post('play-media');
    }

    closeQuestion() {
        this.server.post('select-question').then(() => {
            this.fetchData();
            this.state.window = WINDOWS.PICK_CATEGORY;
        });
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
                    <button onClick={this.activateBuzzers.bind(this)} type="button" className="question-buttons double-button question-text-button" id="start-button" disabled={this.state.gameState.state !== STATES.WAITING}>{startText}</button>
                    <button onClick={this.showAnswer.bind(this)} type="button" className="question-buttons double-button question-text-button" id="answer-button" disabled={this.state.gameState.state < STATES.ARMED || this.state.gameState.state === STATES.ANSWERED}>Show Answer</button>
                </div>

                <div className="media-controls" style={{ display: this.state.gameState.activeQuestion.type === "Video" || this.state.gameState.activeQuestion.type === "Audio" ? "block" : "none" }}>
                    <hr></hr>
                    <button onClick={this.rewindMedia.bind(this)} type="button" className="question-buttons double-button question-text-button" id='rewind-button'>Rewind</button>
                    <button onClick={this.playMedia.bind(this)} type="button" className="question-buttons double-button question-text-button" id='play-button'>Play</button>
                </div>

                <hr></hr>
                <button onClick={this.closeQuestion.bind(this)} type="button" id="question-done-button">Done</button>
            </div>
        )
    }

    pickQuestionButton() {
        if (this.state.gameState.state === STATES.SETUP) {
            this.server.post("start-game");
        } else {
            if (!this.state.gameState || !this.state.gameState.activeQuestion) {
                this.changeWindow(WINDOWS.PICK_CATEGORY);
            } else {
                this.changeWindow(WINDOWS.QUESTION);
            }
        }
    }

    openLogWindow() {
        this.server.get('event-log')
        .then(res => {
            this.setState({ log: res.data });
            this.changeWindow(WINDOWS.LOG);
        });
    }

    openBindWindow() {
        this.server.get('event-log')
        .then(res => {
            this.setState({ log: res.data });
            this.changeWindow(WINDOWS.BIND_PLAYER);
        });
    }

    // logPanel() {
    //     if (!this.state.log || !this.window === WINDOWS.LOG) { return; }
    //     // var textarea = document.getElementById('textarea_id');
    //     // textarea.scrollTop = textarea.scrollHeight;
    //     return (
    //         // <div className="log-panel" style={{ display: this.state.window === WINDOWS.LOG ? "block" : "none" }}>
    //         //     <textarea className="event-log" readOnly={true} value={"> " + this.state.log.join("\n> ")}></textarea>
    //         // </div>
    //         <div className="log-flex-container" style={{ height: "70vh" }}>
    //             <div>
    //                 {this.state.log.map(line => <div>{line}</div>)}
    //             </div>
    //         </div>
    //     )
    // }

    // bindLogPanel() {
    //     if (!this.state.log || !this.window === WINDOWS.BIND_PLAYER) { return; }
    //     // var textarea = document.getElementById('textarea_id');
    //     // textarea.scrollTop = textarea.scrollHeight;
    //     return (
    //         // <div className="log-panel" style={{ display: this.state.window === WINDOWS.BIND_PLAYER ? "block" : "none" }}>
    //         //     <textarea className="event-log" id="bind-log" readOnly={true} value={"> " + this.state.log.join("\n> ")}></textarea>
    //         // </div>
    //         <div className="log-flex-container" style={{ height: "15vh" }}>
    //             <div>
    //                 {this.state.log.map(line => <div>{line}</div>)}
    //             </div>
    //         </div>
    //     )
    // }

    genericLogPanel(window, height) {
        if (!this.state.log || !(this.state.window === window)) { return; }
        return (
            <div className="log-flex-container" style={{ height: height }}>
                <div>
                    {this.state.log.map(line => {
                        const result = clcPattern.exec(line);
                        const style = {}
                        

                        if (result[2] !== undefined) {

                            if (result[2] < 40 || (result[2] >= 90 && result[2] < 100)) {
                                style.color = clcColours.get(parseInt(result[2]));
                            } else {
                                style.backgroundColor = clcColours.get(parseInt(result[2]));
                            }
                        }


                        return <div style={style}>{result[3]}</div>
                    })}
                </div>
            </div>
        )
    }


    // Debug editing
    editPickCategory(category) {
        this.setState({
            editingCategory: category
        });
        this.changeWindow(WINDOWS.EDIT_PICK_QUESTION);
    }

    editPickCategoryPanel() {
        if (!this.state.board) { return; }
        return (
            <div className="pick-category" style={{ display: this.state.window === WINDOWS.EDIT_PICK_CATEGORY ? "block" : "none" }}>
                {this.state.board.map(category => <button onClick={() => this.editPickCategory(category)} type="button">{category.title}</button>)}
            </div>
        )
    }

    editPickQuestion(question) {
        this.setState({
            editingQuestion: question
        });
        this.changeWindow(WINDOWS.EDITING_QUESTION);
    }

    editPickQuestionPanel() {
        if (!this.state.editingCategory) { return; }
        return (
            <div className="pick-question" style={{ display: this.state.window === WINDOWS.EDIT_PICK_QUESTION ? "block" : "none" }}>
                {this.state.editingCategory.questions.map(question => <button onClick={() => this.editPickQuestion(question)} type="button">{question.reward}</button>)}
            </div>
        )
    }

    setQuestionComplete(complete) {
        this.server.post("override-question-state", {
            category: this.state.editingCategory.title,
            question: this.state.editingQuestion.title,
            complete: complete
        }).then(() => {
            this.fetchData(this.updateEditingQuestion.bind(this));
            this.server.post('select-question');
        });
    }

    
    editQuestionPanel() {
        if (!this.state.gameState || !this.state.editingQuestion) { return; }
        
        return (
            <div className="question" style={{ display: this.state.window === WINDOWS.EDITING_QUESTION ? "block" : "none" }}>
                <p className="question-details">{this.state.editingCategory.title} for {this.state.editingQuestion.reward}</p>
                <p className="question-details" id="question-text">{this.state.editingQuestion.title}</p>
                <p className="question-details">Answer: {this.state.editingQuestion.answer}</p>
                {/* <p className="question-details">Reward: {this.state.gameState.activeQuestion.reward}</p> */}


                <hr></hr>
                <h4>Game Controls</h4>
                <div id="display-controls">
                    <button onClick={() => this.setQuestionComplete(true)} type="button" className="question-buttons double-button question-text-button" id="set-completed-button" disabled={this.state.editingQuestion.complete}>Set Completed</button>
                    <button onClick={() => this.setQuestionComplete(false)} type="button" className="question-buttons double-button question-text-button" id="set-complete-button" disabled={!this.state.editingQuestion.complete}>Set Incomplete</button>
                </div>

                <hr></hr>
                <button onClick={() => this.changeWindow(WINDOWS.DEBUG)} type="button" id="question-done-button">Done</button>
            </div>
        )
    }

    updateEditingQuestion() {
        console.log("Updating the editing...");
        console.log(this.state.board);
        const updatedCategory = this.state.board.find(c => c.title === this.state.editingCategory.title);
        const updatedQuestion = updatedCategory.questions.find(q => q.title === this.state.editingQuestion.title);
        this.setState({
            editingQuestion: updatedQuestion
        });
    }

    openLoadWindow() {
        this.setState({ savedGames: null });

        this.server.get('read-save-games')
        .then(res => {
            console.log(res);
            this.setState({ savedGames: res.data });
        });


        this.changeWindow(WINDOWS.LOAD_GAME);
    }

    loadPanel() {
        let saveList;
        if (this.state.savedGames !== null && this.state.savedGames.length > 0) {
            saveList = this.state.savedGames.map(save => {
                const datePattern = /(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/
                const match = save.path.match(datePattern);
                const hour = match[4] % 12 || 12;
                const ampm = match[4] < 12 ? "AM" : "PM";
                return (
                    <div className="save-block">
                        <table className="save-table">
                            <thead>
                                <tr>
                                    <td className="save-cell save-header">Name</td>
                                    <td className="save-cell save-header">Points</td>
                                    <td className="save-cell save-header">Buzzer</td>
                                </tr>
                            </thead>
                            <tbody>
                                {save.playerData.map(player => 
                                    <tr>
                                        <td className="save-cell" style={{color: "#" + player.colour}}>{player.name}</td>
                                        <td className="save-cell">{player.points}</td>
                                        <td className="save-cell">{player.buzzer}</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                        <p className="save-date">{hour}:{match[5]}:{match[6]} {ampm}, {match[3]}/{match[2]}/{match[1]}</p>
                        <button onClick={() => this.loadGame(save.path)}>Load</button>
                    </div>
                )
            });
        } else {
            saveList = <p className="save-load">No saved games found.</p>
        }
        return (
            <div className="save-load" style={{ display: this.state.window === WINDOWS.LOAD_GAME ? "flex" : "none" }}>
                {this.state.savedGames === null ? "Loading saves..." : null}
                {saveList}
            </div>
        )
    }

    loadGame(path) {
        this.server.post('load-game', {
            path: path
        }).then(res => {
            this.server.get('event-log')
            .then(res => {
                this.setState({ log: res.data });
            });
        });
    }

    openSaveWindow() {
        this.server.get('event-log')
        .then(res => {
            this.setState({ log: res.data });
            this.changeWindow(WINDOWS.SAVE_GAME);
        });
    }

    savePanel() {
        return (
            <div className="save-game" style={{ display: this.state.window === WINDOWS.SAVE_GAME ? "block" : "none" }}>
                {this.genericLogPanel(WINDOWS.SAVE_GAME, "8vh")}
                <br></br>
                <button className="question-text-button" onClick={this.saveGame.bind(this)} type="button">Save Game</button>
            </div>
        )
    }

    saveGame() {
        this.server.post('save-game')
        .then(res => {
            this.server.get('event-log')
            .then(res => {
                this.setState({ log: res.data });
            });
        });
    }

    gameStatePanel() {
        return (
            <div className="game-state" style={{ display: this.state.window === WINDOWS.GAME_STATE ? "flex" : "none" }}>
                <p>ID: {this.state.gameState.gameID}</p>
                <p>State: {STATES_LOOKUP[this.state.gameState.state]}</p>
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
                    <button onClick={() => this.pickQuestionButton()} type="button">{this.state.gameState.state === STATES.SETUP ? "Start Game" : "Pick Question"}</button>
                    <button onClick={() => this.changeWindow(WINDOWS.PLAYERS)} type="button">View Players</button>
                    <button onClick={() => this.openBindWindow()} type="button">Bind Player</button>
                    <button onClick={() => this.openLogWindow()} type="button">Event Log</button>
                    <button onClick={() => this.changeWindow(WINDOWS.DEMO)} type="button">Demo Mode</button>
                    <button onClick={() => this.changeWindow(WINDOWS.DEBUG)} type="button">Game Controls</button>
                </div>

                {this.pickCategoryPanel()}
                {this.pickQuestionPanel()}
                {this.readQuestionPanel()}
                

                {this.viewPlayersPanel()}
                {this.editPanel()}
                
                {this.bindPanel()}
                
                {this.genericLogPanel(WINDOWS.LOG, "70vh")}
                <div className="demo-panel" style={{ display: this.state.window === WINDOWS.DEMO ? "block" : "none" }}></div>
                <div className="debug" style={{ display: this.state.window === WINDOWS.DEBUG ? "block" : "none" }}>
                    <button onClick={() => this.changeWindow(WINDOWS.GAME_STATE)} type="button">Game State</button>
                    <button onClick={() => this.changeWindow(WINDOWS.CONTROL_BOARD)} type="button">Control Board</button>
                    <button onClick={() => this.changeWindow(WINDOWS.EDIT_PICK_CATEGORY)} type="button">Edit Questions</button>
                    <button onClick={() => this.openSaveWindow()} type="button">Save Game</button>
                    <button onClick={() => this.openLoadWindow()} type="button">Load Game</button>
                </div>
                <div className="game-state" style={{ display: this.state.window === WINDOWS.GAME_STATE ? "block" : "none" }}></div>
                <div className="control-board" style={{ display: this.state.window === WINDOWS.CONTROL_BOARD ? "block" : "none" }}></div>
     
                {this.editPickCategoryPanel()}
                {this.editPickQuestionPanel()}
                {this.editQuestionPanel()}
                {this.loadPanel()}
                {this.savePanel()}
                {this.gameStatePanel()}
                    




            </div>
        );
    }
}

export default App;
