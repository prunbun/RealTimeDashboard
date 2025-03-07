import { useState, useEffect, useRef } from "react";
import { WatchList } from "./WatchList";

export function App() {

    return (
        <div style={{ fontFamily: "Arial, sans-serif", textAlign: "center", marginTop: "50px" }}>
            <h1>Real-Time Stock Data</h1>
            <WatchList />
        </div>
    );
}