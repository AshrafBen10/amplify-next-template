"use client";
import React from "react";
import { Watch } from "react-loader-spinner";

const Loading = () => {
  return (
    <div className="flex justify-center items-center min-h-screen">
      <div className="flex flex-col items-center">
        <Watch visible={true} height="160" width="160" radius="48" color="#7828C8" ariaLabel="watch-loading" />
        <p className="text-purple-500 mt-8 text-4xl">Loading...</p>
      </div>
    </div>
  );
};

export default Loading;
