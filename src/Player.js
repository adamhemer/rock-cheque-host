import React from "react";
import "./App.css";

class Player extends React.Component {
    constructor(props) {
        super(props);
    }

    componentDidMount() {

    }

    componentWillUnmount() {

    }

    render() {
        return (
            <button onClick={() => this.props.callback(this.props.index)} type="button" className="player-list-item" style={{ border: "5px solid #" + this.props.colour }}>
                {this.props.name}<br></br><span id="player-buzzer-text">Buzzer {this.props.index}</span>
            </button>
        );
    }
}

export default Player;
